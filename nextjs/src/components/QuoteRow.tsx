import { JSX } from 'react';
import Image from 'next/image';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type ImageField = Field<{ src?: string; alt?: string }>;

type QuoteRowProps = ComponentProps & {
  fields: {
    quote: Field<string>;
    author: Field<string>;
    image: ImageField;
  };
};

/**
 * QuoteRow: quote text, author, and image (e.g. headshot).
 */
const QuoteRow = ({ fields }: QuoteRowProps): JSX.Element => {
  const img = fields.image?.value;
  const src = img?.src ?? '';
  const alt = img?.alt ?? fields.author?.value ?? 'Author';

  return (
    <section className="quote-row">
      <blockquote className="quote-row__blockquote">
        <p className="quote-row__quote">
          <Text field={fields.quote} />
        </p>
        <footer className="quote-row__author">
          — <Text field={fields.author} />
        </footer>
      </blockquote>
      {src && (
        <div className="quote-row__media">
          <Image src={src} alt={alt} width={120} height={120} className="quote-row__image" />
        </div>
      )}
    </section>
  );
};

export default withDatasourceCheck()<QuoteRowProps>(QuoteRow);
