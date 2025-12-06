import { createHigherOrderComponent } from "@wordpress/compose";
import { Fragment } from "@wordpress/element";
import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody } from "@wordpress/components";
import WindenAutocompleteWithScreens from "../winauto-component/WindenAutocompleteWithScreens";
import './index.scss';

const { addFilter } = wp.hooks;

const plainClasses = createHigherOrderComponent((BlockEdit) => {
  return (props) => {
    // Only add Plain Classes panel to blocks that support className
    // This prevents conflicts with other plugins that use Monaco or custom editors
    // Check if block supports customClassName (which maps to className attribute)
    const blockType = wp.blocks.getBlockType(props.name);
    const supportsClassName = blockType?.supports?.customClassName !== false;

    if (!supportsClassName) {
      return <BlockEdit {...props} />;
    }

    const defaultClass = "plain-classes";

    const onChange = (value) => {
      props.setAttributes({
        className: value?.length ? [...value].join(' ') : '',
      });
    };

    return (
      <Fragment>
        <BlockEdit {...props} />
        <InspectorControls>
          <PanelBody
            title="Plain Classes"
            className={defaultClass}
          >
            <WindenAutocompleteWithScreens
              onChange={onChange}
              defaultTags={props.attributes?.className ? props.attributes.className.trim().split(' ').filter(c => c) : []}
              isDark={false} />
          </PanelBody>
        </InspectorControls>
      </Fragment>
    );
  };
}, "withInspectorControl");

addFilter(
  "editor.BlockEdit",
  "plain-classes-gutenberg/with-inspector-controls",
  plainClasses
);