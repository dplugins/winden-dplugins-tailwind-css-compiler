/**
 * Editing a Winden image.
 *
 * The canvas shows the same `<img>` the block saves, wearing the same classes
 * and attributes, so a Tailwind `absolute inset-0 object-cover` background
 * looks in the editor as it will on the page. Selection, replacement and
 * resolution reuse the pieces core/image is built from; the difference is
 * only what gets written.
 */

import { __ } from '@wordpress/i18n';
import { useSelect } from '@wordpress/data';
import { store as coreStore } from '@wordpress/core-data';
import {
    useBlockProps,
    InspectorControls,
    BlockControls,
    MediaPlaceholder,
    MediaReplaceFlow,
    store as blockEditorStore,
} from '@wordpress/block-editor';
import {
    PanelBody,
    ToggleControl,
    TextareaControl,
    SelectControl,
    Placeholder,
    BaseControl,
} from '@wordpress/components';
import { HtmlAttributesControl } from '../shared/HtmlAttributesControl';
import { htmlAttributesToProps, sanitizeHtmlAttributes } from '../shared/html-attributes';
import { imageClassName } from './save';
import { imageIcon } from '../shared/icons';

const ALLOWED_MEDIA_TYPES = ['image'];

/** The URL of a size, falling back to the original when the size does not exist */
function sizeUrl(media, sizeSlug) {
    if (!media) return undefined;
    // REST media object (`media_details.sizes`) or the media modal's (`sizes`)
    const sizes = media.media_details?.sizes ?? media.sizes;
    return sizes?.[sizeSlug]?.source_url ?? sizes?.[sizeSlug]?.url ?? media.source_url ?? media.url;
}

export default function Edit({ attributes, setAttributes, context }) {
    const { id, url, alt, width, height, sizeSlug, useFeaturedImage, htmlAttributes } = attributes;
    const { postId, postType } = context;

    const { imageSizes, media, featuredMedia } = useSelect((select) => {
        const { getSettings } = select(blockEditorStore);
        const { getMedia, getEditedEntityRecord } = select(coreStore);
        const featuredId = useFeaturedImage && postId && postType
            ? getEditedEntityRecord('postType', postType, postId)?.featured_media
            : undefined;
        return {
            imageSizes: getSettings().imageSizes ?? [],
            media: id ? getMedia(id, { context: 'view' }) : undefined,
            featuredMedia: featuredId ? getMedia(featuredId, { context: 'view' }) : undefined,
        };
    }, [id, useFeaturedImage, postId, postType]);

    const sizeOptions = imageSizes
        .filter((size) => !media || sizeUrl(media, size.slug))
        .map((size) => ({ value: size.slug, label: size.name }));

    const onSelectImage = (selected) => {
        if (!selected?.url) return;
        setAttributes({
            id: selected.id,
            url: sizeUrl(selected, sizeSlug) ?? selected.url,
            alt: selected.alt ?? '',
            // Dimensions come from the classes; only what the markup already
            // had is kept
            width: undefined,
            height: undefined,
        });
    };

    const onSelectURL = (nextUrl) => {
        if (nextUrl === url) return;
        setAttributes({ id: undefined, url: nextUrl, width: undefined, height: undefined });
    };

    const onChangeSize = (nextSlug) => {
        setAttributes({
            sizeSlug: nextSlug,
            ...(media ? { url: sizeUrl(media, nextSlug) } : {}),
        });
    };

    const shownUrl = useFeaturedImage ? sizeUrl(featuredMedia, sizeSlug) : url;
    const shownAlt = useFeaturedImage ? (featuredMedia?.alt_text ?? '') : (alt ?? '');
    const hasImage = Boolean(shownUrl);

    const blockProps = useBlockProps({
        className: hasImage && !useFeaturedImage ? imageClassName(id) : undefined,
    });
    const extra = htmlAttributesToProps(sanitizeHtmlAttributes(htmlAttributes), blockProps, { inEditor: true });

    const controls = (
        <InspectorControls>
            <PanelBody title={__('Image', 'winden-dplugins-tailwind-css-compiler')}>
                <ToggleControl
                    __nextHasNoMarginBottom
                    label={__('Use featured image', 'winden-dplugins-tailwind-css-compiler')}
                    help={__('Show the featured image of the post this block renders in.', 'winden-dplugins-tailwind-css-compiler')}
                    checked={Boolean(useFeaturedImage)}
                    onChange={(next) => setAttributes({ useFeaturedImage: next })}
                />
                {!useFeaturedImage && (
                    <TextareaControl
                        __nextHasNoMarginBottom
                        label={__('Alternative text', 'winden-dplugins-tailwind-css-compiler')}
                        value={alt ?? ''}
                        onChange={(next) => setAttributes({ alt: next })}
                        help={__('Describe the image for people who cannot see it. Leave empty if it is decorative.', 'winden-dplugins-tailwind-css-compiler')}
                    />
                )}
                {(useFeaturedImage || media) && sizeOptions.length > 0 && (
                    <SelectControl
                        __next40pxDefaultSize
                        __nextHasNoMarginBottom
                        label={__('Resolution', 'winden-dplugins-tailwind-css-compiler')}
                        value={sizeSlug}
                        options={sizeOptions}
                        onChange={onChangeSize}
                    />
                )}
            </PanelBody>
        </InspectorControls>
    );

    const advanced = (
        <InspectorControls group="advanced">
            <BaseControl
                __nextHasNoMarginBottom
                label={__('HTML attributes', 'winden-dplugins-tailwind-css-compiler')}
                help={__('Written onto the <img> as-is: loading, decoding, aria-*, data-*, style, or anything else.', 'winden-dplugins-tailwind-css-compiler')}
            >
                <HtmlAttributesControl
                    value={htmlAttributes}
                    onChange={(next) => setAttributes({ htmlAttributes: next })}
                />
            </BaseControl>
        </InspectorControls>
    );

    if (useFeaturedImage && !hasImage) {
        return (
            <div {...blockProps}>
                {controls}
                {advanced}
                <Placeholder
                    icon={imageIcon}
                    label={__('Featured image', 'winden-dplugins-tailwind-css-compiler')}
                    instructions={
                        postId
                            ? __('This post has no featured image yet. Nothing renders until one is set.', 'winden-dplugins-tailwind-css-compiler')
                            : __('Shows the featured image of the post being viewed.', 'winden-dplugins-tailwind-css-compiler')
                    }
                />
            </div>
        );
    }

    if (!hasImage) {
        return (
            <div {...blockProps}>
                {controls}
                {advanced}
                <MediaPlaceholder
                    icon={imageIcon}
                    labels={{
                        title: __('Winden Image', 'winden-dplugins-tailwind-css-compiler'),
                        instructions: __('Just the <img>, for Tailwind classes. Upload, pick from the library, or paste a URL.', 'winden-dplugins-tailwind-css-compiler'),
                    }}
                    onSelect={onSelectImage}
                    onSelectURL={onSelectURL}
                    accept="image/*"
                    allowedTypes={ALLOWED_MEDIA_TYPES}
                    value={{ id, src: url }}
                />
            </div>
        );
    }

    return (
        <>
            {controls}
            {advanced}
            {!useFeaturedImage && (
                <BlockControls group="other">
                    <MediaReplaceFlow
                        mediaId={id}
                        mediaURL={url}
                        allowedTypes={ALLOWED_MEDIA_TYPES}
                        accept="image/*"
                        onSelect={onSelectImage}
                        onSelectURL={onSelectURL}
                        name={__('Replace', 'winden-dplugins-tailwind-css-compiler')}
                    />
                </BlockControls>
            )}
            <img
                {...blockProps}
                {...extra}
                src={shownUrl}
                alt={shownAlt}
                {...(width ? { width } : {})}
                {...(height ? { height } : {})}
            />
        </>
    );
}
