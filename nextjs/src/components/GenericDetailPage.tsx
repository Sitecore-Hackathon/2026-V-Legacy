import { JSX } from 'react';
import { Placeholder } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

/**
 * Generic Detail Page: route template that exposes the jss-main placeholder.
 * Use this as the route template in Sitecore for detail pages.
 */
const GenericDetailPage = ({ rendering }: ComponentProps): JSX.Element => (
  <div className="generic-detail-page">
    <Placeholder name="jss-main" rendering={rendering} />
  </div>
);

export default GenericDetailPage;
