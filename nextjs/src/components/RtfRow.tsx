import { JSX } from 'react';
import { RichText, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type RtfRowProps = ComponentProps & {
  fields: {
    body: Field<string>;
  };
};

/**
 * RTF Row: rich text field content.
 */
const RtfRow = ({ fields }: RtfRowProps): JSX.Element => (
  <section className="rtf-row">
    <RichText className="rtf-row__body" field={fields.body} />
  </section>
);

export default withDatasourceCheck()<RtfRowProps>(RtfRow);
