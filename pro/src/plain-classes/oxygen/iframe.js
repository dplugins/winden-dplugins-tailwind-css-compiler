self.addEventListener("load", () => {
    ["regexTest", "filter"].forEach((value) => {
        const keyMethod = `${value}CustomTag`;
        const oldMethod = iframeScope[keyMethod];
        /**
         * Custom tag
         * @param {string} tag
         */
        iframeScope[keyMethod] = (tag) =>
            /^[a-z]([a-z0-9]*\-){1,}[a-z0-9]*$/.test(tag) ? tag : oldMethod(tag);
    });
    /**
     * Custom className
     * @param {string} className
     */
    iframeScope.validateClassName = (className) => /^[^\s]+$/.test(className);
});