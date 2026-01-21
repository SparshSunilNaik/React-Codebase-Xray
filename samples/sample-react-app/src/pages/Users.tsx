import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface User {
    id: number;
    name: string;
    email: string;
}

export function Users() {
    const { id } = useParams();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Intentionally missing id in deps array - will be caught by lint
        axios.get('/api/users')
            .then(res => setUsers(res.data))
            .finally(() => setLoading(false));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (loading) return <p>Loading...</p>;

    return (
        <div>
            <h1>{id ? `User ${id}` : 'All Users'}</h1>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name}</li>
                ))}
            </ul>
        </div>
    );
}
