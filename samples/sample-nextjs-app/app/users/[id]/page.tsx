interface UserPageProps {
    params: { id: string };
}

export default function UserPage({ params }: UserPageProps) {
    return (
        <main>
            <h1>User {params.id}</h1>
            <p>User details will appear here.</p>
        </main>
    );
}
