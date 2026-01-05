// frontend/src/App.tsx
import { useEffect, useState } from 'react'
import { apiClient } from './services/api'

function App() {
    const [message, setMessage] = useState('')

    useEffect(() => {
        // Use centralized API client instead of hardcoded URL
        apiClient
            .get('/hello')
            .then((res) => setMessage(res.data.message))
            .catch(() =>
                setMessage('Failed to fetch from backend. Is it running?')
            )
    }, [])

    return (
        <div>
            <h1>AeroDine Frontend</h1>
            <p>
                Message from server: <strong>{message}</strong>
            </p>
        </div>
    )
}

export default App
