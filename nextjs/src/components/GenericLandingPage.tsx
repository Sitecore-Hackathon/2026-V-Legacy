import { JSX } from 'react';
import { Placeholder } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

/**
 * Generic Landing Page: route template that exposes the jss-main placeholder.
 * Use this as the route template in Sitecore for landing pages.
 */
const GenericLandingPage = ({ rendering }: ComponentProps): JSX.Element => (
  <div className="generic-landing-page">
    <Placeholder name="jss-main" rendering={rendering} />
  </div>
);

export default GenericLandingPage;
