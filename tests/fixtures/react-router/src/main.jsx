import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { routes } from './routes'

createRoot(document.getElementById('root')).render(<RouterProvider router={createBrowserRouter(routes)} />)
