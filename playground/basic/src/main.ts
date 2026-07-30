import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './pages/Home.vue'
import Explore from './pages/Explore.vue'
import Product from './pages/Product.vue'
import SignIn from './pages/SignIn.vue'
import Checkout from './pages/Checkout.vue'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: Home, meta: { title: 'Home' } },
    { path: '/explore', name: 'explore', component: Explore, meta: { title: 'Explore' } },
    { path: '/products/:id', name: 'product', component: Product, meta: { title: 'Product detail' } },
    { path: '/sign-in', name: 'sign-in', component: SignIn, meta: { title: 'Sign in' } },
    { path: '/checkout', name: 'checkout', component: Checkout, meta: { title: 'Checkout' } },
  ],
})

createApp(App).use(router).mount('#app')
