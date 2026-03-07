import React, { JSX } from 'react';
import Head from 'next/head';
import { Placeholder, LayoutServiceData, Field, HTMLLink } from '@sitecore-jss/sitecore-jss-nextjs';
import config from 'temp/config';
import Navigation from 'src/Navigation';
import Scripts from 'src/Scripts';

// Prefix public assets with a public URL to enable compatibility with Sitecore editors.
const publicUrl = config.publicUrl;

interface LayoutProps {
  layoutData: LayoutServiceData;
  headLinks: HTMLLink[];
  componentFactory?: (
    name: string
  ) => React.ComponentType<{ rendering: unknown; params: Record<string, string> }> | null;
}

interface RouteFields {
  [key: string]: unknown;
  pageTitle: Field;
}

const Layout = ({ layoutData, headLinks, componentFactory }: LayoutProps): JSX.Element => {
  const { route } = layoutData.sitecore;

  const fields = route?.fields as RouteFields;

  // When a route template component exists (e.g. GenericLandingPage, GenericDetailPage), use it; otherwise render the placeholder directly.
  const routeName = route?.name;
  const RouteComponent = componentFactory && routeName ? componentFactory(routeName) : null;
  const routeParams =
    route && 'params' in route ? (route as { params?: Record<string, string> }).params : {};
  const mainContent =
    RouteComponent && route ? (
      <RouteComponent rendering={route} params={routeParams || {}} />
    ) : route ? (
      <Placeholder name="headless-main" rendering={route} />
    ) : null;

  return (
    <>
      <Scripts />
      <Head>
        <title>{fields.pageTitle?.value.toString() || 'Page'}</title>
        <link rel="icon" href={`${publicUrl}/favicon.ico`} />
        {headLinks.map((headLink) => (
          <link rel={headLink.rel} key={headLink.href} href={headLink.href} />
        ))}
      </Head>

      <Navigation />
      {/* root placeholder for the app, which we add components to using route data */}
      <div className="body">{mainContent}</div>
    </>
  );
};

export default Layout;
