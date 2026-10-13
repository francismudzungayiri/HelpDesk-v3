import React from 'react';

// A ruled label cell: caption caps inside the box, the control borderless below it.
// Cells sit in a .label-grid so neighbouring boxes share one 1px rule.
const LabelField = ({ id, label, hint, error, children, span = 1 }) => (
  <div className={`label-field${error ? ' has-error' : ''}${span === 2 ? ' span-2' : ''}`}>
    <label htmlFor={id}>{label}</label>
    {children}
    {hint && !error && <p className="label-field-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="label-field-error" id={`${id}-error`}>{error}</p>}
  </div>
);

export default LabelField;
