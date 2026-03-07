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
const MastheadWithImage = ({ fields }: MastheadWithImageProps): JSX.Element => {
  const img = fields.image?.value;
  const src = img?.src ?? '';
  const alt = img?.alt ?? fields.heading?.value ?? '';

  return (
    <header className="masthead-with-image">
      <div className="masthead-with-image__content">
        <Text tag="h1" className="masthead-with-image__heading" field={fields.heading} />
        <div className="masthead-with-image__description">
          <Text field={fields.description} />
        </div>
      </div>
      {src && (
        <div className="masthead-with-image__media">
          <Image src={src} alt={alt} width={1200} height={630} className="masthead-with-image__img" />
        </div>
      )}
    </header>
  );
};

export default withDatasourceCheck()<MastheadWithImageProps>(MastheadWithImage);
