import { Link } from 'react-router-dom';

export function Header() {
    return (
        <header>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/about">About</Link>
                <Link to="/users">Users</Link>
            </nav>
        </header>
    );
}
