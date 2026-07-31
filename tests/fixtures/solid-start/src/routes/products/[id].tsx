import { useParams } from '@solidjs/router'
export default function Product() { const params = useParams(); return <main><h1>Product {params.id}</h1></main> }
