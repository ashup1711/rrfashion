import { Link } from 'react-router-dom';
import { ROUTES } from '../../utils/constants';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb = ({ items }: BreadcrumbProps) => {
  // SEO structured data (JSON-LD BreadcrumbList)
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: ROUTES.HOME,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.label,
        ...(item.path ? { item: item.path } : {}),
      })),
    ],
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-2 text-sm">
        <li>
          <Link
            to={ROUTES.HOME}
            className="text-neutral-dark hover:text-primary-600 transition-colors"
          >
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-neutral-medium"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {item.path ? (
              <Link
                to={item.path}
                className="text-neutral-dark hover:text-primary-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-primary-900 font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </nav>
  );
};

export default Breadcrumb;
