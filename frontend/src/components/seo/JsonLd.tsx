import { Helmet } from 'react-helmet-async';

interface JsonLdProps {
  data: Record<string, unknown>;
}

/**
 * JsonLd — REQ-FE-011
 *
 * Renders a JSON-LD structured data script tag in the document head.
 * SEC-08: Data is passed as a JS object and serialized via JSON.stringify —
 * no dangerouslySetInnerHTML with user input, safe from XSS.
 */
const JsonLd = ({ data }: JsonLdProps) => {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(data)}
      </script>
    </Helmet>
  );
};

export default JsonLd;
