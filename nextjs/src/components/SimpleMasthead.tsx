import { JSX } from 'react';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type SimpleMastheadProps = ComponentProps & {
  fields: {
    heading: Field<string>;
    description: Field<string>;
  };
};

/**
 * Simple Masthead: heading and multiline description.
 */
const SimpleMasthead = ({ fields }: SimpleMastheadProps): JSX.Element => (
  <div>
    <header className="simple-masthead">
      <Text tag="h1" className="simple-masthead__heading" field={fields.heading} />
      <div className="simple-masthead__description">
        <Text field={fields.description} />
      </div>
    </header>
  </div>
);

export default withDatasourceCheck()<SimpleMastheadProps>(SimpleMasthead);
