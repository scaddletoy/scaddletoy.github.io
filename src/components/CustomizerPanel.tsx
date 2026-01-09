// Portions of this file are Copyright 2021 Google LLC, and licensed under GPL2+. See COPYING.

import React, { CSSProperties } from 'react';

import { Parameter, ParameterSet } from '../services/openscad-wasm-runner/actions.ts';
import { CenteredSpinner } from './CenteredSpinner.tsx';
import { InputNumber } from 'primereact/inputnumber';
import { InputText } from 'primereact/inputtext';
import { Fieldset } from 'primereact/fieldset';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { Slider } from 'primereact/slider';
import styles from './CustomizerPanel.module.css';

interface CustomizerProps {
  className?: string;
  style?: CSSProperties;
  parameterSet?: ParameterSet;
  parameterValues: { [key: string]: any };
  onChange: (name: string, value: any) => void;
}

export default function CustomizerPanel(props: CustomizerProps) {
  const groupedParameters = (props.parameterSet?.parameters ?? []).reduce(
    (acc, param) => {
      if (!acc[param.group]) {
        acc[param.group] = [];
      }
      acc[param.group].push(param);
      return acc;
    },
    {} as { [key: string]: any[] },
  );

  const groups = Object.entries(groupedParameters);
  const skipSingleRootGroup = groups.length === 1;

  return props.parameterSet ?
      <div
        className={styles.customizerRoot + (props.className ? ' ' + props.className : '')}
        style={props.style}
      >
        {groups.map(([group, params]) =>
          skipSingleRootGroup ?
            <>
              {params.map((param) => (
                <ParameterInput
                  key={param.name}
                  value={props.parameterValues[param.name]}
                  param={param}
                  handleChange={props.onChange}
                />
              ))}
            </>
          : <Fieldset className={styles.customizerFieldset} key={group} legend={group} toggleable>
              {params.map((param) => (
                <ParameterInput
                  key={param.name}
                  value={props.parameterValues[param.name]}
                  param={param}
                  handleChange={props.onChange}
                />
              ))}
            </Fieldset>,
        )}
      </div>
    : <CenteredSpinner text="Waiting for customizer to run" />;
}

function ParameterInput({
  param,
  value,
  style,
  handleChange,
}: {
  param: Parameter;
  value: any;
  style?: React.CSSProperties;
  handleChange: (key: string, value: any) => void;
}) {
  const resetVisible =
    value !== undefined && JSON.stringify(value) !== JSON.stringify(param.initial);
  return (
    <div className={styles.parameterInput} style={style}>
      <div className={styles.parameterInputRow}>
        <div className={styles.parameterInputLeft}>
          <label className={styles.parameterInputLabel}>
            <b>{param.name}</b>
            <i
              className={
                'pi pi-refresh '
                + styles.parameterInputReset
                + ' '
                + (resetVisible ?
                  styles.parameterInputResetVisible
                : styles.parameterInputResetHidden)
              }
              onClick={() => handleChange(param.name, param.initial)}
            ></i>
          </label>
          <div className={styles.parameterInputCaption}>{param.caption}</div>
        </div>
        <div className={styles.parameterInputRight}>
          {param.type === 'number' && 'options' in param && (
            <Dropdown
              className={styles.parameterInputDropdown}
              value={value || param.initial}
              options={param.options}
              onChange={(e) => handleChange(param.name, e.value)}
              optionLabel="name"
              optionValue="value"
            />
          )}
          {param.type === 'string' && param.options && (
            <Dropdown
              className={styles.parameterInputDropdown}
              value={value || param.initial}
              options={param.options}
              onChange={(e) => handleChange(param.name, e.value)}
              optionLabel="name"
              optionValue="value"
            />
          )}
          {param.type === 'boolean' && (
            <Checkbox
              checked={value ?? param.initial}
              onChange={(e) => handleChange(param.name, e.checked)}
            />
          )}
          {!Array.isArray(param.initial) && param.type === 'number' && !('options' in param) && (
            <InputNumber
              className={styles.parameterInputNumber}
              value={value || param.initial}
              showButtons
              size={5}
              onValueChange={(e) => handleChange(param.name, e.value)}
            />
          )}
          {param.type === 'string' && !param.options && (
            <InputText
              className={styles.parameterInputText}
              value={value || param.initial}
              onChange={(e) => handleChange(param.name, e.target.value)}
            />
          )}
          {Array.isArray(param.initial) && 'min' in param && (
            <div className={styles.parameterInputArrayRow}>
              {param.initial.map((_, index) => (
                <InputNumber
                  className={styles.parameterInputNumber}
                  key={index}
                  value={value?.[index] ?? (param.initial as any)[index]}
                  min={param.min}
                  max={param.max}
                  showButtons
                  size={5}
                  step={param.step}
                  onValueChange={(e) => {
                    const newArray = [...(value ?? param.initial)];
                    newArray[index] = e.value;
                    handleChange(param.name, newArray);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {!Array.isArray(param.initial) && param.type === 'number' && param.min !== undefined && (
        <Slider
          className={styles.parameterInputSlider}
          value={value || param.initial}
          min={param.min}
          max={param.max}
          step={param.step}
          onChange={(e) => handleChange(param.name, e.value)}
        />
      )}
    </div>
  );
}
