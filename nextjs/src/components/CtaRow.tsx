import { JSX } from 'react';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
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
  const link = fields.link?.value;
  const href = link?.href ?? '#';
  const text = link?.text ?? 'Learn more';
  const target = link?.target ?? '_self';

  return (
    <section className="container">
      <div className="flex items-center">
        <a href={href} target={target} className="mr-2 text-white">
          <SearchIcon className="size-6" />
        </a>
        <Text tag="p" className="text-h2 text-white" field={fields.heading} />
      </div>
      <div className="">
        <Text field={fields.description} className="text-copy-medium" />
      </div>
      <a
        href={href}
        target={target}
        rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
        role="button"
      >
        {text}
      </a>
    </section>
  );
};

export default withDatasourceCheck()<CtaRowProps>(CtaRow);
