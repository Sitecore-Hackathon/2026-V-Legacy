import React, { JSX } from 'react';
import Head from 'next/head';
import { Placeholder, LayoutServiceData, Field, HTMLLink } from '@sitecore-jss/sitecore-jss-nextjs';
import config from 'temp/config';
import Navigation from 'src/Navigation';
import Scripts from 'src/Scripts';

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

        {/* Accessibility DOM Bridge */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){

console.log("[A11Y] DOM bridge loaded");

window.addEventListener("message", function(event){

  if(!event.data) return;

  if(event.data.type === "A11Y_SCAN_REQUEST"){

    console.log("[A11Y] scan request received");

    try{

      const body = document.body;
      const main = document.querySelector("main");
      const nextRoot = document.querySelector("#__next");

      console.log("[A11Y] body children:", body?.children?.length);
      console.log("[A11Y] main found:", !!main);
      console.log("[A11Y] __next found:", !!nextRoot);

      console.log("[A11Y] image count:", document.querySelectorAll("img").length);
      console.log("[A11Y] button count:", document.querySelectorAll("button").length);
      console.log("[A11Y] link count:", document.querySelectorAll("a").length);

      // Delay to ensure Next.js hydration completed
      setTimeout(function(){

        const html = document.documentElement.outerHTML;

        console.log("[A11Y] DOM preview:", html.substring(0,1000));
        console.log("[A11Y] DOM length:", html.length);

        event.source.postMessage({
          type:"A11Y_SCAN_RESULT",
          html: html
        },"*");

        console.log("[A11Y] DOM sent back to requester");

      }, 500);

    }catch(err){

      console.error("[A11Y] DOM extraction failed", err);

      event.source.postMessage({
        type:"A11Y_SCAN_RESULT",
        error:"DOM extraction failed"
      },"*");

    }

  }

});

})();`,
          }}
        />
      </Head>

      <Navigation />

      <div className="body">{mainContent}</div>
    </>
  );
};

export default Layout;