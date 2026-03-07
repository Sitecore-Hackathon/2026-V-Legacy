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
const QuoteRow = ({ fields, rendering }: QuoteRowProps): JSX.Element => {
  const uid = rendering.uid;
  const img = fields.image?.value;
  const src = img?.src ?? '';
  const alt = img?.alt ?? fields.author?.value ?? 'Author';

  return (
    <section
      className="container max-w-[1020px] flex flex-col gap-4 lg:flex-row"
      aria-labelledby={`quote-row-${uid}`}
    >
      <blockquote className="w-[80%] flex flex-col justify-center">
        <Text tag="p" className="text-h3 mb-4" field={fields.quote} />
        <p className="text-copy-medium italic text-monochrome/50">
          - <Text tag="span" field={fields.author} />
        </p>
      </blockquote>
      {src && (
        <div className="w-[350px] relative">
          <div className="absolute inset-0 bg-secondary-light -rotate-25 [clip-path:polygon(100%_0,100%_100%,0_100%)] -z-1" />
          <div className="absolute inset-0 size-1/3 bg-primary-light -z-1" />
          <div className="rounded-full overflow-hidden aspect-square size-full">
            <Image
              src={src}
              alt={alt}
              width={120}
              height={120}
              className="size-full object-cover"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default withDatasourceCheck()<QuoteRowProps>(QuoteRow);
