import { JSX } from 'react';
import { Text, Field, withDatasourceCheck, Link } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';
import { SearchIcon } from 'src/assets/svg-icons';

type LinkField = Field<{ href?: string; text?: string; target?: string }>;

type CtaRowProps = ComponentProps & {
  fields: {
    heading: Field<string>;
    description: Field<string>;
    link: LinkField;
  };
};

/**
 * CTA Row: heading, description, and link.
 */
const CtaRow = ({ fields }: CtaRowProps): JSX.Element => {
  const href = fields.link?.value?.href ?? '/';
  const target = fields.link?.value?.target ?? '_blank';

  return (
    <section className="container">
      <div className="flex items-center">
        <a href={href} target={target} className="mr-2 text-white" aria-label="Search">
          <SearchIcon className="size-6" />
          <p className="w-0 h-0 overflow-hidden">Search</p>
        </a>
        <Text tag="p" className="text-h2 text-white" field={fields.heading} />
      </div>
      <div className="mt-4">
        <Text tag="p" field={fields.description} className="text-copy-medium" />
      </div>
      <Link field={fields.link} aria-label="Learn more" />
    </section>
  );
};

export default withDatasourceCheck()<CtaRowProps>(CtaRow);
