import { JSX } from 'react';
import Image from 'next/image';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

/** Shape of one card when coming from a list/datasource (e.g. Treelist of card items) */
export type CardItem = {
  id?: string;
  fields?: {
    image?: { value?: { src?: string; alt?: string } };
    link?: { value?: { href?: string; text?: string; target?: string } };
  };
  image?: { value?: { src?: string; alt?: string } };
  link?: { value?: { href?: string; text?: string; target?: string } };
};

type CardListProps = ComponentProps & {
  fields: {
    heading: Field<string>;
    /** List of cards - from Treelist/Multilist of card items, or a custom list field */
    cards: Field<CardItem[]>;
  };
};

function getCardImage(item: CardItem | undefined) {
  if (!item) return { src: '', alt: '' };
  const img = item.fields?.image ?? item.image;
  const v = img?.value ?? (img as { src?: string; alt?: string } | undefined);
  return { src: v?.src ?? '', alt: v?.alt ?? '' };
}

function getCardLink(item: CardItem | undefined) {
  if (!item) return { href: '#', text: 'View', target: '_self' as const };
  const lnk = item.fields?.link ?? item.link;
  const v = lnk?.value ?? (lnk as { href?: string; text?: string; target?: string } | undefined);
  return {
    href: v?.href ?? '#',
    text: v?.text ?? 'View',
    target: (v?.target as '_self' | '_blank') ?? '_self',
  };
}

/**
 * CardList: heading and a list of cards. Each card has an image and a link.
 */
const CardList = ({ fields }: CardListProps): JSX.Element => {
  const heading = fields.heading;
  const cards = fields.cards;
  console.log("LOADING CARD LIST", fields);
  return (
    <section className="card-list">
      <Text tag="h2" className="card-list__heading" field={heading} />
      <ul className="card-list__cards">
        {Array.isArray(cards) &&
          cards.map((card, index) => {
            console.log("LOADING CARD LIST", card);
            const image = getCardImage(card as CardItem);
            const link = getCardLink(card as CardItem);

            return (
              <li key={(card as CardItem)?.id ?? index} className="card-list__card">
                {image.src && (
                  <div className="card-list__card-media">
                    <Image src={image.src} alt={image.alt || link.text} width={400} height={250} className="card-list__card-image" />
                  </div>
                )}
                <a
                  href={link.href}
                  target={link.target}
                  rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                  className="card-list__card-link"
                >
                  {link.text}
                </a>
              </li>
            );
          })}
      </ul>
    </section>
  );
};

export default withDatasourceCheck()<CardListProps>(CardList);
