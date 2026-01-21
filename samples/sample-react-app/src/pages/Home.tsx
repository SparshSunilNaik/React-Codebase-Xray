import { useCounter } from '../hooks/useCounter';

export function Home() {
    const { count, increment, decrement } = useCounter(0);

    return (
        <div>
            <h1>Home Page</h1>
            <p>Count: {count}</p>
            <button onClick={increment}>+</button>
            <button onClick={decrement}>-</button>
        </div>
    );
}
