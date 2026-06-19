import { useState, useEffect } from 'react'
import TextInput from "@components/ui/TextInput";
import { Button } from "@components/ui/Button";

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
        <form onSubmit={handleSubmit} className="space-y-2 text-left">
            <h2 className="text-xl font-semibold">Basic Info</h2>

            <TextInput
                id="firstName"
                label="First Name"
                value={FirstName}
                onChange={(e) => setFirstName(e.target.value)}
            />

            <TextInput
                id="lastName"
                label="Last Name"
                value={LastName}
                onChange={(e) => setLastName(e.target.value)}
            />

            <TextInput
                id="email"
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit">Update Info</Button>
        </form>
    )
}
