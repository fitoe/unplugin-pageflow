export default async function Product({ params }) {
  const { id } = await params
  return <main><h1>Product {id}</h1></main>
}
