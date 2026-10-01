/**
 * The "HTML attributes" control — name/value rows a block's root element wears.
 *
 * Shared by the core blocks Winden extends and by `winden/image`. It edits one
 * object attribute; the caller decides where it renders (the Advanced panel).
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, TextControl, Flex, FlexItem, FlexBlock, Notice } from '@wordpress/components';
import { isAllowedAttributeName, sanitizeHtmlAttributes } from './html-attributes';

export function HtmlAttributesControl({ value, onChange }) {
    const entries = Object.entries(value ?? {});
    const [draftName, setDraftName] = useState('');
    const [draftValue, setDraftValue] = useState('');
    const [error, setError] = useState(null);

    const commit = (next) => onChange(sanitizeHtmlAttributes(next));

    const update = (name, nextValue) => commit({ ...(value ?? {}), [name]: nextValue });
    const remove = (name) => {
        const next = { ...(value ?? {}) };
        delete next[name];
        commit(next);
    };

    const add = () => {
        const name = draftName.trim().toLowerCase();
        if (!isAllowedAttributeName(name)) {
            setError(
                name === 'class' || name === 'id'
                    ? __('Use "Additional CSS class(es)" and "HTML anchor" for class and id.', 'winden-dplugins-tailwind-css-compiler')
                    : name.startsWith('on')
                        ? __('Event handlers cannot be stored on a block.', 'winden-dplugins-tailwind-css-compiler')
                        : __('That is not a valid attribute name.', 'winden-dplugins-tailwind-css-compiler')
            );
            return;
        }
        setError(null);
        commit({ ...(value ?? {}), [name]: draftValue });
        setDraftName('');
        setDraftValue('');
    };

    return (
        <div className="winden-html-attributes">
            {entries.map(([name, current]) => (
                <Flex key={name} align="flex-end" gap={2} className="winden-html-attributes__row">
                    <FlexBlock>
                        <TextControl
                            __next40pxDefaultSize
                            __nextHasNoMarginBottom
                            label={name}
                            value={current}
                            onChange={(next) => update(name, next)}
                        />
                    </FlexBlock>
                    <FlexItem>
                        <Button
                            __next40pxDefaultSize
                            variant="tertiary"
                            isDestructive
                            label={__('Remove attribute', 'winden-dplugins-tailwind-css-compiler')}
                            onClick={() => remove(name)}
                        >
                            {__('Remove', 'winden-dplugins-tailwind-css-compiler')}
                        </Button>
                    </FlexItem>
                </Flex>
            ))}

            <Flex align="flex-end" gap={2} className="winden-html-attributes__row winden-html-attributes__row--new">
                <FlexBlock>
                    <TextControl
                        __next40pxDefaultSize
                        __nextHasNoMarginBottom
                        label={__('Attribute', 'winden-dplugins-tailwind-css-compiler')}
                        placeholder="aria-hidden"
                        value={draftName}
                        onChange={setDraftName}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}
                    />
                </FlexBlock>
                <FlexBlock>
                    <TextControl
                        __next40pxDefaultSize
                        __nextHasNoMarginBottom
                        label={__('Value', 'winden-dplugins-tailwind-css-compiler')}
                        placeholder="true"
                        value={draftValue}
                        onChange={setDraftValue}
                        onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add(); } }}
                    />
                </FlexBlock>
                <FlexItem>
                    <Button __next40pxDefaultSize variant="secondary" onClick={add} disabled={!draftName.trim()}>
                        {__('Add', 'winden-dplugins-tailwind-css-compiler')}
                    </Button>
                </FlexItem>
            </Flex>

            {error && (
                <Notice status="warning" isDismissible={false} className="winden-html-attributes__notice">
                    {error}
                </Notice>
            )}
        </div>
    );
}
