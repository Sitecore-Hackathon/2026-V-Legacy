import { JSX } from 'react';
import Image from 'next/image';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type ImageField = Field<{ src?: string; alt?: string }>;

type MastheadWithImageProps = ComponentProps & {
  fields: {
    heading: Field<string>;
    description: Field<string>;
    image: ImageField;
  };
};

/**
 * Masthead with image: heading, multiline description, and image.
 */
const MastheadWithImage = ({ fields, rendering }: MastheadWithImageProps): JSX.Element => {
  const uid = rendering.uid;
  const img = fields.image?.value;
  const src = img?.src ?? '';

  return (
    <section
      className="container flex flex-col gap-4 lg:flex-row"
      aria-labelledby={`masthead-${uid}`}
    >
      <div className="m-auto w-1/2">
        <Text tag="p" className="text-h2 w-fit mb-4" field={fields.heading} />
        <Text tag="p" className="text-copy-medium w-[80%]" field={fields.description} />
      </div>
      {src && (
        <div className="rounded-lg overflow-hidden aspect-4/3 w-1/2">
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          {/* @ts-expect-error - alt omitted intentionally for a11y testing */}
          <Image src={src} width={1200} height={630} className="size-full object-cover" />
        </div>
      )}
    </section>
  );
};

export default withDatasourceCheck()<MastheadWithImageProps>(MastheadWithImage);
