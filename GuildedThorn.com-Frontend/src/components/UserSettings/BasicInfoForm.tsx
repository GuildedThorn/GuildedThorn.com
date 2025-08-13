import { useState, useEffect } from 'react'

export default function BasicInfoForm() {
    const [FirstName, setFirstName] = useState('')
    const [LastName, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        // Fetch current user data
        fetch('/api/auth/me', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                setFirstName(data.firstName)
                setLastName(data.lastName)
                setEmail(data.email)
            })
    }, [])

    const validateEmail = (email: string) => {
        // Simple email regex for validation
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const handleSubmit = async (e: { preventDefault: () => void }) => {
        e.preventDefault()

        if (!validateEmail(email)) {
            setError('Please enter a valid email address.')
            return
        }
        setError('') // Clear previous error

        await fetch('/api/user/updateData', {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ FirstName, LastName, email })
        })
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Info</h2>

            <div>
                <label className="block text-sm font-medium">First Name</label>
                <input
                    type="text"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={FirstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Last Name</label>
                <input
                    type="text"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={LastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                />
            </div>

            <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                    type="email"
                    className="input border-white border-2 p-4 rounded-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <button type="submit">Update Info</button>
        </form>
    )
}
