import Link from 'next/link';
export default function PlayersPage() {
    return (
      <div>
        <h1 className="text-3xl font-bold">Players Page</h1>
        <p>This is where player information will be displayed.</p>
        <Link href="/" className="text-blue-600 hover:underline">
Go home</Link>
      </div>
    );
  }