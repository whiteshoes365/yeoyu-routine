import './styles/main.css'
import { mountApp } from './app'

const root = document.getElementById('app')
if (!root) throw new Error('#app missing')
mountApp(root)
