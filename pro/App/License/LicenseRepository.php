<?php

namespace Winden\Pro\License;

use Winden\Pro\License\License;

class LicenseRepository
{
    public const DB_OPTION = 'winden_license';

    /**
     * @return array
     */
    private static function defaultState()
    {
        return (new License())->toArray();
    }

    /**
     * @return License
     */
    public static function get()
    {
        return new License(get_option(self::DB_OPTION, self::defaultState()));
    }

    /**
     * @param array $attributes
     * @return void
     */
    public static function update(array $attributes = [])
    {
        $model = self::get();
        $model->fill($attributes);

        update_option(self::DB_OPTION, $model->toArray());
    }

    /**
     * @return void
     */
    public static function reset()
    {
        update_option(self::DB_OPTION, self::defaultState());
    }
}
