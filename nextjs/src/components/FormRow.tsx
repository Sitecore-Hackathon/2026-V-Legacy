import { JSX } from 'react';
import { Text, Field, withDatasourceCheck } from '@sitecore-jss/sitecore-jss-nextjs';
import { ComponentProps } from 'lib/component-props';

type FormRowProps = ComponentProps & {
  fields: {
    heading: Field<string>;
    namePlaceholder: Field<string>;
    descriptionPlaceholder: Field<string>;
    submitLabel: Field<string>;
  };
};

/**
 * Form Row: heading, name input placeholder text, description textarea placeholder text, and submit button label.
 */
const FormRow = ({ fields, rendering }: FormRowProps): JSX.Element => {
  const uid = rendering.uid;
  const namePlaceholder = fields.namePlaceholder?.value ?? 'Name';
  const descriptionPlaceholder = fields.descriptionPlaceholder?.value ?? 'Description';
  const submitLabel = fields.submitLabel?.value ?? 'Submit';

  return (
    <section className="container">
      <Text tag="p" className="text-h2 mb-4" field={fields.heading} />
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <div className="flex flex-col gap-2">
          <label className="" htmlFor={`form-row-name-${uid}`}>
            <span className="form-row__label-text">{namePlaceholder}</span>
          </label>
          <input
            id={`form-row-name-${uid}-1`}
            type="text"
            className="form-row__input"
            placeholder={namePlaceholder}
            autoComplete="name"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="form-row__label" htmlFor={`form-row-description-${uid}2`}>
            <span className="form-row__label-text">{descriptionPlaceholder}</span>
          </label>
          <textarea
            id={`form-row-description-${uid}-2`}
            className="form-row__textarea"
            placeholder={descriptionPlaceholder}
            rows={4}
          />
        </div>
        <button
          type="submit"
          className="bg-primary-dark min-h-[44px] w-fit text-white rounded-sm p-2"
          role="button"
          aria-label={submitLabel}
          aria-hidden="true"
        ></button>
      </form>
    </section>
  );
};

export default withDatasourceCheck()<FormRowProps>(FormRow);
