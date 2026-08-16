import assert from 'node:assert/strict'
import test from 'node:test'
import { faker } from '@faker-js/faker/locale/zh_CN'
import { Window } from 'happy-dom'
import * as formFill from '../src/runtime/form-fill.ts'

function createFormWindow() {
  const window = new Window({ url: 'http://localhost/pages/register' })
  Object.assign(globalThis, { window, document: window.document })
  window.document.body.innerHTML = `
    <form>
      <label for="name">联系人姓名</label>
      <input id="name" name="contactName" maxlength="20">
      <label>手机号码 <input name="mobile" type="tel"></label>
      <label>企业邮箱 <input name="email" type="email"></label>
      <label>企业名称 <input name="companyName"></label>
      <label>身份证号 <input name="idCard"></label>
      <label>备注 <textarea name="remark"></textarea></label>
      <label>角色
        <select name="role" required>
          <option value="">请选择</option>
          <option value="farmer">农户</option>
          <option value="expert">专家</option>
        </select>
      </label>
      <label><input name="agreement" type="checkbox" required> 同意协议</label>
      <input name="password" type="password" value="secret">
      <input name="captchaCode" value="1234">
      <input name="disabledField" disabled value="keep">
      <input name="manualOnly" data-pageflow-fill="skip" value="keep">
    </form>
  `
  return window
}

test('scans native controls and generates varied safe values with Faker', () => {
  faker.seed(20260816)
  const window = createFormWindow()
  const first = formFill.scanPageFlowFormControls(window.document)
  const second = formFill.scanPageFlowFormControls(window.document)

  assert.equal(first.controls.length, 8)
  assert.deepEqual(first.controls.map(item => item.identity), second.controls.map(item => item.identity))
  assert.notEqual(first.controls.find(item => item.identity === 'name:contactName').suggestedValue, second.controls.find(item => item.identity === 'name:contactName').suggestedValue)
  assert.deepEqual(first.skipped, { sensitive: 2, unavailable: 1, unsupported: 1 })
  assert.match(first.controls.find(item => item.identity === 'name:mobile').suggestedValue, /^1[3-9]\d{9}$/)
  assert.match(first.controls.find(item => item.identity === 'name:email').suggestedValue, /^[^@\s]+@[^@\s]+\.[^@\s]+$/)
  assert.match(first.controls.find(item => item.identity === 'name:companyName').suggestedValue, /公司$/)
  const idCard = first.controls.find(item => item.identity === 'name:idCard').suggestedValue
  assert.match(idCard, /^\d{17}[\dX]$/)
  assert.equal('10X98765432'[[...idCard.slice(0, 17)].reduce((sum, digit, index) => sum + Number(digit) * [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2][index], 0) % 11], idCard.at(-1))
  assert.equal(first.controls.some(item => typeof item.suggestedValue === 'string' && /pageflow|测试|示例/i.test(item.suggestedValue)), false)
  assert.equal(first.controls.find(item => item.identity === 'name:role').suggestedValue, 'farmer')
  assert.equal(first.controls.find(item => item.identity === 'name:agreement').suggestedValue, true)
  assert.equal(first.controls.some(item => /password|captcha/i.test(item.identity)), false)
  window.close()
})

test('infers uni-app field labels and protects verification codes', () => {
  const window = new Window({ url: 'http://localhost/pages/reset-password' })
  Object.assign(globalThis, { window, document: window.document })
  window.document.body.innerHTML = `
    <uni-view class="reset-form">
      <uni-label class="uni-label-pointer auth-field">
        <uni-text class="auth-field-label">手机号</uni-text>
        <uni-view class="auth-field-control"><uni-view class="wd-input"><uni-input class="wd-input__inner"><div class="uni-input-wrapper"><div class="uni-input-placeholder">请输入...</div><input type="number" class="uni-input-input"></div></uni-input></uni-view></uni-view>
      </uni-label>
      <uni-label class="uni-label-pointer auth-field">
        <uni-text class="auth-field-label">验证码</uni-text>
        <uni-view class="auth-field-control"><uni-view class="wd-input"><uni-input class="wd-input__inner"><div class="uni-input-wrapper"><div class="uni-input-placeholder">请输入...</div><input type="number" class="uni-input-input"></div></uni-input></uni-view></uni-view>
      </uni-label>
      <uni-label class="uni-label-pointer auth-field">
        <uni-text class="auth-field-label">新密码</uni-text>
        <uni-view class="auth-field-control"><input type="password"></uni-view>
      </uni-label>
    </uni-view>
  `

  const scan = formFill.scanPageFlowFormControls(window.document)
  assert.equal(scan.controls.length, 1)
  assert.equal(scan.controls[0].label, '手机号')
  assert.equal(scan.controls[0].kind, 'number')
  assert.match(scan.controls[0].suggestedValue, /^1[3-9]\d{9}$/)
  assert.deepEqual(scan.skipped, { sensitive: 2, unavailable: 0, unsupported: 0 })
  window.close()
})

test('generates a visible positive value for an unconstrained uni-app decimal input', () => {
  faker.seed(20260816)
  const window = new Window({ url: 'http://localhost/pages/farmer/generate/index' })
  Object.assign(globalThis, { window, document: window.document })
  window.document.body.innerHTML = `
    <uni-view class="planting-field">
      <uni-text class="planting-field-label">批次重量</uni-text>
      <uni-view class="wd-input">
        <uni-input><input type="number" inputmode="decimal" step="0.000000000000000001" class="uni-input-input"></uni-input>
      </uni-view>
    </uni-view>
  `

  const scan = formFill.scanPageFlowFormControls(window.document)
  assert.equal(scan.controls.length, 1)
  assert.equal(scan.controls[0].label, '批次重量')
  assert.equal(scan.controls[0].kind, 'number')
  assert.ok(Number(scan.controls[0].suggestedValue) > 0)
  assert.match(scan.controls[0].suggestedValue, /^\d+$/)

  const result = formFill.applyPageFlowFormValues({ [scan.controls[0].id]: scan.controls[0].suggestedValue }, window.document)
  assert.deepEqual(result.applied, [scan.controls[0].id])
  assert.ok(Number(window.document.querySelector('input').value) > 0)
  window.close()
})

test('keeps generated dates within the past year and respects field bounds', () => {
  faker.seed(20260816)
  const window = new Window({ url: 'http://localhost/pages/farmer/plantings/edit' })
  Object.assign(globalThis, { window, document: window.document })
  const today = new Date()
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const formatDate = date => [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const minimum = new Date(today)
  minimum.setMonth(minimum.getMonth() - 3)
  window.document.body.innerHTML = `
    <label>种植日期 <input name="plantingDate" type="date"></label>
    <label>采收时间 <input name="harvestedAt" type="datetime-local"></label>
    <label>受限日期 <input name="boundedDate" type="date" min="${formatDate(minimum)}" max="${formatDate(today)}"></label>
  `

  const scan = formFill.scanPageFlowFormControls(window.document)
  const values = Object.fromEntries(scan.controls.map(control => [control.identity, control.suggestedValue]))
  const start = formatDate(oneYearAgo)
  const end = formatDate(today)
  assert.ok(values['name:plantingDate'] >= start && values['name:plantingDate'] <= end)
  assert.ok(values['name:harvestedAt'].slice(0, 10) >= start && values['name:harvestedAt'].slice(0, 10) <= end)
  assert.ok(values['name:boundedDate'] >= formatDate(minimum) && values['name:boundedDate'] <= end)
  window.close()
})

test('scans and selects uni-app selector pickers through their component items', () => {
  const window = new Window({ url: 'http://localhost/pages/register/region' })
  Object.assign(globalThis, { window, document: window.document })
  window.document.body.innerHTML = `
    <uni-view class="picker-field">
      <uni-text class="picker-label">县区</uni-text>
      <uni-picker>
        <div class="uni-picker-container uni-selector-select">
          <div class="uni-picker-select">
            <div class="uni-picker-item">余杭区</div>
            <div class="uni-picker-item">临平区</div>
          </div>
        </div>
        <uni-view class="picker-value">请选择县区</uni-view>
      </uni-picker>
    </uni-view>
    <uni-picker disabled><div class="uni-picker-container"></div></uni-picker>
  `
  const picker = window.document.querySelector('uni-picker:not([disabled])')
  let selected = ''
  picker.addEventListener('click', (event) => {
    if (event.target.classList?.contains('uni-picker-item')) selected = event.target.textContent
  })

  const scan = formFill.scanPageFlowFormControls(window.document)
  assert.equal(scan.controls.length, 1)
  assert.equal(scan.controls[0].kind, 'picker')
  assert.equal(scan.controls[0].label, '县区')
  assert.deepEqual(scan.controls[0].options.map(option => option.label), ['余杭区', '临平区'])
  assert.equal(scan.skipped.unavailable, 1)

  const result = formFill.applyPageFlowFormValues({ [scan.controls[0].id]: scan.controls[0].suggestedValue }, window.document)
  assert.deepEqual(result.applied, [scan.controls[0].id])
  assert.equal(selected, '余杭区')
  window.close()
})

test('applies edited values through native events and restores the pre-fill state', () => {
  const window = createFormWindow()
  const scan = formFill.scanPageFlowFormControls(window.document)
  const name = scan.controls.find(item => item.identity === 'name:contactName')
  const role = scan.controls.find(item => item.identity === 'name:role')
  const agreement = scan.controls.find(item => item.identity === 'name:agreement')
  const values = Object.fromEntries(scan.controls.map(item => [item.id, item.suggestedValue]))
  values[name.id] = '自定义测试姓名'
  let inputEvents = 0
  let changeEvents = 0
  window.document.addEventListener('input', () => inputEvents++)
  window.document.addEventListener('change', () => changeEvents++)

  const result = formFill.applyPageFlowFormValues(values, window.document)
  assert.equal(result.applied.length, scan.controls.length)
  assert.equal(result.canUndo, true)
  assert.equal(window.document.querySelector('[name=contactName]').value, '自定义测试姓名')
  assert.equal(window.document.querySelector('[name=role]').value, 'farmer')
  assert.equal(window.document.querySelector('[name=agreement]').checked, true)
  assert.equal(window.document.querySelector('[name=password]').value, 'secret')
  assert.equal(window.document.querySelector('[name=captchaCode]').value, '1234')
  assert.equal(inputEvents, scan.controls.length)
  assert.equal(changeEvents, scan.controls.length)

  const restored = formFill.undoPageFlowFormFill(window.document)
  assert.equal(restored.applied.length, scan.controls.length)
  assert.equal(restored.canUndo, false)
  assert.equal(window.document.querySelector('[name=contactName]').value, '')
  assert.equal(window.document.querySelector('[name=role]').value, '')
  assert.equal(window.document.querySelector('[name=agreement]').checked, false)
  window.close()
})

test('reports stale and invalid field values without touching the page', () => {
  const window = createFormWindow()
  const scan = formFill.scanPageFlowFormControls(window.document)
  const agreement = scan.controls.find(item => item.identity === 'name:agreement')
  const result = formFill.applyPageFlowFormValues({ missing: 'value', [agreement.id]: 'yes' }, window.document)
  assert.deepEqual(result.missing, ['missing'])
  assert.deepEqual(result.skipped, [{ id: agreement.id, reason: '此字段需要布尔值' }])
  assert.equal(window.document.querySelector('[name=agreement]').checked, false)
  window.close()
})
