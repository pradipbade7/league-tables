import Link from 'next/link';
import leagues from './data/leagues.json';

export default function Home() {
  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Football League Tables</h1>
        <p className="mt-3 max-w-2xl mx-auto text-xl text-gray-500 sm:mt-4">
          Select a league to view current standings
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {leagues.map(league => (
          <LeagueCard 
            key={league.id}
            name={league.name}
            country={league.country}
            slug={league.slug}
            bgColor={league.bgColor}
            logo={league.logo}
          />
        ))}
      </div>
    </div>
  );
}

interface LeagueCardProps {
  name: string;
  country: string;
  slug: string;
  bgColor: string;
  logo: string;
}

function LeagueCard({ name, country, slug, bgColor, logo }: LeagueCardProps) {
  return (
    <Link href={`/table/${slug}`} className="group">
      <div className={`${bgColor} rounded-xl shadow-md overflow-hidden group-hover:shadow-xl transition-shadow duration-300`}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">{name}</h2>
            <img src={logo} alt={`${name} logo`} className="h-12 w-12" />
          </div>
         
        </div>
      </div>
    </Link>
  );
}