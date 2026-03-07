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
const CardList = ({ fields, rendering }: CardListProps): JSX.Element => {
  const heading = fields.heading;
  const cards = fields.cards;
  const uid = rendering.uid;

  return (
    <section className="container" aria-labelledby={`card-list-${uid}`}>
      <Text tag="p" className="text-h2 text-center mb-4" field={heading} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(cards) &&
          cards.map((card, index) => {
            const image = getCardImage(card as CardItem);
            const link = getCardLink(card as CardItem);

            return (
              <li
                key={(card as CardItem)?.id ?? index}
                className="relative rounded-lg flex flex-col group overflow-hidden"
              >
                {image.src && (
                  <a
                    href={link.href}
                    target={link.target}
                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                    className="after:content-[''] after:absolute after:inset-0 after:w-full after:h-full after:z-1"
                  >
                    <div className="aspect-square size-full overflow-hidden">
                      {/* eslint-disable-next-line jsx-a11y/alt-text */}
                      {/* @ts-expect-error - alt omitted intentionally for a11y testing */}
                      <Image
                        src={image.src}
                        width={400}
                        height={250}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  </a>
                )}
                <div className="p-4 bg-secondary-light group-hover:bg-secondary transition-colors duration-300">
                  <p className="text-copy-medium text-center">{link.text}</p>
                </div>
              </li>
            );
          })}
      </div>
    </section>
  );
};

export default withDatasourceCheck()<CardListProps>(CardList);
