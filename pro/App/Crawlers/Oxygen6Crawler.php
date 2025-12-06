<?php

namespace Winden\Pro\Crawlers;

use Winden\App\Caching\StringParser;

class Oxygen6Crawler
{
    use StringParser;

    /**
     * @var \WP_Post[]
     */
    private array $posts;

    /**
     * @param \WP_Post[] $posts
     */
    public function __construct(array $posts)
    {
        $this->posts = $posts;
    }

    /**
     * @return array
     */
    public function classes()
    {
        $classes = [];

        // Get Oxygen6 selectors from wp_options
        $selectors_json = get_option('oxygen_oxy_selectors_json_string', '');

        if (!empty($selectors_json)) {
            $selectors = json_decode($selectors_json, true);
            
            if (is_array($selectors)) {
                $selectorClasses = $this->parseSelectors($selectors);
                $classes = array_merge($classes, $selectorClasses);

            } else {
            }
        } else {
        }

        // Extract classes from post meta _oxygen_data
        $postMetaClasses = $this->extractClassesFromPostMeta();
        $classes = array_merge($classes, $postMetaClasses);

        return array_unique($classes);
    }

    /**
     * Parse Oxygen6 selectors JSON structure
     * 
     * @param array $selectors
     * @return array
     */
    private function parseSelectors(array $selectors)
    {
        $classes = [];

        foreach ($selectors as $selector) {
            // Extract class name from the 'name' field
            if (isset($selector['name']) && !empty($selector['name'])) {
                $className = $selector['name'];
                
                // Only add if it's a valid class name (not empty and not just whitespace)
                if (trim($className) !== '') {
                    $classes[] = $className;
                }
            }

            // Recursively parse children if they exist
            if (isset($selector['children']) && is_array($selector['children'])) {
                $childClasses = $this->parseSelectors($selector['children']);
                $classes = array_merge($classes, $childClasses);
            }
        }

        return $classes;
    }

    /**
     * Extract classes from post meta _oxygen_data
     * 
     * @return array
     */
    private function extractClassesFromPostMeta()
    {
        $classes = [];

        foreach ($this->posts as $post) {
            // Get _oxygen_data meta for this post
            $oxygen_data = get_post_meta($post->ID, '_oxygen_data', true);
            
            if (!empty($oxygen_data)) {
                // Parse the oxygen_data JSON
                $oxygen_data_array = json_decode($oxygen_data, true);
                
                if (is_array($oxygen_data_array) && isset($oxygen_data_array['tree_json_string'])) {
                    // Parse the tree_json_string
                    $tree_data = json_decode($oxygen_data_array['tree_json_string'], true);
                    
                    if (is_array($tree_data)) {
                        $postClasses = $this->parseTreeData($tree_data);
                        $classes = array_merge($classes, $postClasses);

                    } else {
                    }
                } else {
                }
            } else {
            }
        }

        return $classes;
    }

    /**
     * Parse Oxygen6 tree data structure to extract classes
     * 
     * @param array $treeData
     * @return array
     */
    private function parseTreeData(array $treeData)
    {
        $classes = [];

        // Extract classes from root level
        if (isset($treeData['root'])) {
            $rootClasses = $this->extractClassesFromNode($treeData['root']);
            $classes = array_merge($classes, $rootClasses);
        }

        return $classes;
    }

    /**
     * Extract classes from a single node in the tree
     * 
     * @param array $node
     * @return array
     */
    private function extractClassesFromNode(array $node)
    {
        $classes = [];

        // Extract classes from node properties
        if (isset($node['data']['properties']['meta']['classes'])) {
            $nodeClasses = $node['data']['properties']['meta']['classes'];
            if (is_array($nodeClasses)) {
                $classes = array_merge($classes, $nodeClasses);

            }
        }

        // Extract classes from HTML content (html_code)
        if (isset($node['data']['properties']['content']['content']['html_code'])) {
            $htmlCode = $node['data']['properties']['content']['content']['html_code'];

            $htmlClasses = $this->extractClassesFromHtml($htmlCode);
            $classes = array_merge($classes, $htmlClasses);
        }
        
        // Extract classes from PHP content (php_code)
        if (isset($node['data']['properties']['content']['content']['php_code'])) {
            $phpCode = $node['data']['properties']['content']['content']['php_code'];

            $phpClasses = $this->extractClassesFromHtml($phpCode);
            $classes = array_merge($classes, $phpClasses);
        }
        
        // Extract classes from JavaScript content (javascript_code)
        if (isset($node['data']['properties']['content']['content']['javascript_code'])) {
            $jsCode = $node['data']['properties']['content']['content']['javascript_code'];

            $jsClasses = $this->extractClassesFromHtml($jsCode);
            $classes = array_merge($classes, $jsClasses);
        }

        // Recursively process children
        if (isset($node['children']) && is_array($node['children'])) {
            foreach ($node['children'] as $child) {
                $childClasses = $this->extractClassesFromNode($child);
                $classes = array_merge($classes, $childClasses);
            }
        }

        return $classes;
    }

    /**
     * Extract CSS classes from HTML content
     * 
     * @param string $html
     * @return array
     */
    private function extractClassesFromHtml($html)
    {
        $classes = [];

        // Use regex to find class attributes
        preg_match_all('/class\s*=\s*["\']([^"\']+)["\']/', $html, $matches);
        
        if (isset($matches[1])) {
            foreach ($matches[1] as $classString) {
                // Split classes by whitespace
                $classArray = preg_split('/\s+/', trim($classString));
                foreach ($classArray as $class) {
                    if (!empty($class)) {
                        $classes[] = $class;

                    }
                }
            }
        } else {
        }

        return $classes;
    }
} 