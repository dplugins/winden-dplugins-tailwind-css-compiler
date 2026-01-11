import { createHigherOrderComponent } from "@wordpress/compose";
import { Fragment } from "@wordpress/element";
import { InspectorControls } from "@wordpress/block-editor";
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
          <div className="plain-classes-container plain-classes">
              <div className="plain-classes-container-header">
                  <svg height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M164.62-520q-26.66 0-45.64-18.98T100-584.62v-130.76q0-26.66 18.98-45.64T164.62-780H520v260H164.62Zm0-40H480v-180H164.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v130.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92Zm0 380q-26.66 0-45.64-18.98T100-244.62v-130.76q0-26.66 18.98-45.64T164.62-440H600v260H164.62Zm0-40H560v-180H164.62q-10.77 0-17.7 6.92-6.92 6.93-6.92 17.7v130.76q0 10.77 6.92 17.7 6.93 6.92 17.7 6.92ZM680-180v-340h-80v-260h250.77l-80 204.62h78.46L680-180ZM200-280h60v-60h-60v60Zm0-340h60v-60h-60v60Zm-60 60V-740v180Zm0 340V-400v180Z" /></svg>
                  <h3>Plain Classes</h3>
              </div>
              <WindenAutocompleteWithScreens
                onChange={onChange}
                defaultTags={props.attributes?.className ? props.attributes.className.trim().split(' ').filter(c => c) : []}
                isDark={false} />
          </div>
         
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