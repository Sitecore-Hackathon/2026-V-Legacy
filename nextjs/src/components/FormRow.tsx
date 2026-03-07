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
const FormRow = ({ fields }: FormRowProps): JSX.Element => {
  const namePlaceholder = fields.namePlaceholder?.value ?? 'Name';
  const descriptionPlaceholder = fields.descriptionPlaceholder?.value ?? 'Description';
  const submitLabel = fields.submitLabel?.value ?? 'Submit';

  return (
    <section className="form-row">
      <Text tag="h2" className="form-row__heading" field={fields.heading} />
      <form className="form-row__form" onSubmit={(e) => e.preventDefault()}>
        <label className="form-row__label" htmlFor="form-row-name">
          <span className="form-row__label-text">{namePlaceholder}</span>
          <input
            id="form-row-name"
            type="text"
            className="form-row__input"
            placeholder={namePlaceholder}
            autoComplete="name"
            aria-label={namePlaceholder}
          />
        </label>
        <label className="form-row__label" htmlFor="form-row-description">
          <span className="form-row__label-text">{descriptionPlaceholder}</span>
          <textarea
            id="form-row-description"
            className="form-row__textarea"
            placeholder={descriptionPlaceholder}
            rows={4}
            aria-label={descriptionPlaceholder}
          />
        </label>
        <button type="submit" className="form-row__submit">
          {submitLabel}
        </button>
      </form>
    </section>
  );
};

export default withDatasourceCheck()<FormRowProps>(FormRow);
