import { JSX } from 'react';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

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
    <section className="cta-row">
      <Text tag="h2" className="cta-row__heading" field={fields.heading} />
      <div className="cta-row__description">
        <Text field={fields.description} />
      </div>
      <a href={href} target={target} rel={target === '_blank' ? 'noopener noreferrer' : undefined} className="cta-row__link">
        {text}
      </a>
    </section>
  );
};

export default withDatasourceCheck()<CtaRowProps>(CtaRow);
