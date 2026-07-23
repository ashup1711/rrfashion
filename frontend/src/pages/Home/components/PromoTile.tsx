import { Link } from 'react-router-dom';

export interface PromoTileConfig {
  title: string;
  subtitle: string;
  cta: string;
  link: string;
  bgColor: string;
}

interface PromoTileProps {
  config: PromoTileConfig;
}

const PromoTile = ({ config }: PromoTileProps) => {
  const [line1, line2] = config.title.split('\n');

  return (
    <Link
      to={config.link}
      className={`${config.bgColor} text-white rounded-xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[400px] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`}
      aria-label={`${config.cta} - ${config.subtitle}`}
    >
      <div className="space-y-3 max-w-xs">
        <h3 className="font-display text-2xl md:text-3xl font-bold leading-tight whitespace-pre-line">
          {line1}
          {line2 ? <span className="block">{line2}</span> : null}
        </h3>
        <p className="text-body-small opacity-90">{config.subtitle}</p>
        <span className="inline-block mt-4 px-6 py-2.5 bg-white text-primary-900 rounded-full text-sm font-semibold uppercase tracking-widest hover:bg-primary-100 transition-colors">
          {config.cta}
        </span>
      </div>
    </Link>
  );
};

export default PromoTile;
