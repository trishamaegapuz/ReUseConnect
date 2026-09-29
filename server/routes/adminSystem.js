const express = require('express');
const os = require('os');
const fs = require('fs');

const pool = require('../config/db');

const {
  authMiddleware,
  adminOnly
} = require('../middleware/authMiddleware');

const router = express.Router();

/*
============================================================
AUTHENTICATION
============================================================
*/

router.use(
  authMiddleware,
  adminOnly
);


/*
============================================================
HELPERS
============================================================
*/

const formatBytes = (bytes) => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
    return 0;
  }

  return Number(
    (Number(bytes) / (1024 * 1024 * 1024)).toFixed(2)
  );
};


const formatUptime = (seconds) => {
  const days = Math.floor(seconds / 86400);

  const hours = Math.floor(
    (seconds % 86400) / 3600
  );

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  const secs = Math.floor(
    seconds % 60
  );

  return {
    days,
    hours,
    minutes,
    seconds: secs
  };
};


const getDiskUsage = () => {
  try {
    if (typeof fs.statfsSync !== 'function') {
      return {
        usedPercent: 0,
        usedGB: 0,
        totalGB: 0,
        freeGB: 0
      };
    }

    const stats = fs.statfsSync(process.cwd());

    const total =
      Number(stats.blocks) *
      Number(stats.bsize);

    const free =
      Number(stats.bavail) *
      Number(stats.bsize);

    const used =
      total - free;

    const usedPercent =
      total > 0
        ? Number(
            ((used / total) * 100).toFixed(1)
          )
        : 0;

    return {
      usedPercent,
      usedGB: formatBytes(used),
      totalGB: formatBytes(total),
      freeGB: formatBytes(free)
    };

  } catch (error) {
    console.error(
      'DISK USAGE ERROR:',
      error.message
    );

    return {
      usedPercent: 0,
      usedGB: 0,
      totalGB: 0,
      freeGB: 0
    };
  }
};


const getMemoryUsage = () => {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();

  const usedMemory =
    totalMemory - freeMemory;

  const usedPercent =
    totalMemory > 0
      ? Number(
          (
            (usedMemory / totalMemory) *
            100
          ).toFixed(1)
        )
      : 0;

  return {
    totalGB: formatBytes(totalMemory),
    usedGB: formatBytes(usedMemory),
    freeGB: formatBytes(freeMemory),
    usedPercent
  };
};


/*
============================================================
CPU USAGE
============================================================
*/

const getCpuUsage = () => {
  const cpus = os.cpus();

  if (!cpus.length) {
    return 0;
  }

  let idle = 0;
  let total = 0;

  cpus.forEach((cpu) => {
    const times = cpu.times;

    idle += times.idle;

    total +=
      times.user +
      times.nice +
      times.sys +
      times.irq +
      times.idle;
  });

  if (total === 0) {
    return 0;
  }

  return Number(
    (
      ((total - idle) / total) *
      100
    ).toFixed(1)
  );
};


/*
============================================================
DATABASE CHECK
============================================================
*/

const checkDatabase = async () => {
  try {
    const result = await pool.query(
      'SELECT NOW() AS current_time'
    );

    return {
      online: true,
      serverTime: result.rows[0].current_time
    };

  } catch (error) {
    console.error(
      'DATABASE CHECK ERROR:',
      error.message
    );

    return {
      online: false,
      serverTime: null
    };
  }
};


/*
============================================================
DATABASE SIZE
============================================================
*/

const getDatabaseSize = async () => {
  try {
    const result = await pool.query(`
      SELECT pg_database_size(
        current_database()
      ) AS size
    `);

    const sizeBytes =
      Number(
        result.rows[0]?.size || 0
      );

    return {
      sizeBytes,
      sizeGB: formatBytes(sizeBytes)
    };

  } catch (error) {
    console.error(
      'DATABASE SIZE ERROR:',
      error.message
    );

    return {
      sizeBytes: 0,
      sizeGB: 0
    };
  }
};


/*
============================================================
ACTIVE DATABASE SESSIONS
============================================================
*/

const getActiveSessions = async () => {
  try {
    const result = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state IS NOT NULL
    `);

    return Number(
      result.rows[0]?.count || 0
    );

  } catch (error) {
    console.error(
      'ACTIVE SESSION ERROR:',
      error.message
    );

    return 0;
  }
};


/*
============================================================
POSTGRESQL VERSION
============================================================
*/

const getPostgresVersion = async () => {
  try {
    const result = await pool.query(`
      SELECT
        current_setting(
          'server_version'
        ) AS version
    `);

    return (
      result.rows[0]?.version ||
      'Unknown'
    );

  } catch (error) {
    console.error(
      'POSTGRES VERSION ERROR:',
      error.message
    );

    return 'Unknown';
  }
};


/*
============================================================
SYSTEM SUMMARY
============================================================

GET /api/admin/system/summary

This is the endpoint used by the frontend.
============================================================
*/

router.get(
  '/summary',
  async (req, res) => {

    try {

      const database =
        await checkDatabase();

      const databaseSize =
        await getDatabaseSize();

      const activeSessions =
        await getActiveSessions();

      const memory =
        getMemoryUsage();

      const disk =
        getDiskUsage();

      const cpu =
        getCpuUsage();

      const uptimeSeconds =
        process.uptime();

      const uptime =
        formatUptime(
          uptimeSeconds
        );

      return res.json({

        success: true,

        summary: {

          server: {

            status: 'Online',

            nodeVersion:
              process.version,

            platform:
              process.platform,

            hostname:
              os.hostname(),

            uptimeSeconds:
              Math.floor(
                uptimeSeconds
              ),

            uptime

          },

          database: {

            status:
              database.online
                ? 'Online'
                : 'Offline',

            sizeBytes:
              databaseSize.sizeBytes,

            sizeGB:
              databaseSize.sizeGB

          },

          resources: {

            cpu,

            memory:
              memory.usedPercent,

            disk:
              disk.usedPercent,

            /*
            Node.js does not provide
            total system network traffic
            directly.
            Therefore this is null,
            NOT fake data.
            */

            network: null

          },

          memory,

          storage: disk,

          activeSessions

        }

      });

    } catch (error) {

      console.error(
        'SYSTEM SUMMARY ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system summary.'

      });

    }

  }
);


/*
============================================================
BACKWARD COMPATIBILITY
============================================================

Old frontend/backend code may still use /overview.
Keep it working.
============================================================
*/

router.get(
  '/overview',
  async (req, res) => {

    try {

      const database =
        await checkDatabase();

      const databaseSize =
        await getDatabaseSize();

      const activeSessions =
        await getActiveSessions();

      const memory =
        getMemoryUsage();

      const disk =
        getDiskUsage();

      const cpu =
        getCpuUsage();

      const uptimeSeconds =
        process.uptime();

      const uptime =
        formatUptime(
          uptimeSeconds
        );

      return res.json({

        success: true,

        overview: {

          server: {

            status: 'Online',

            nodeVersion:
              process.version,

            platform:
              process.platform,

            hostname:
              os.hostname(),

            uptimeSeconds:
              Math.floor(
                uptimeSeconds
              ),

            uptime

          },

          database: {

            status:
              database.online
                ? 'Online'
                : 'Offline',

            sizeBytes:
              databaseSize.sizeBytes,

            sizeGB:
              databaseSize.sizeGB

          },

          resources: {

            cpu,

            memory:
              memory.usedPercent,

            disk:
              disk.usedPercent,

            network: null

          },

          memory,

          storage: disk,

          activeSessions

        }

      });

    } catch (error) {

      console.error(
        'SYSTEM OVERVIEW ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system overview.'

      });

    }

  }
);


/*
============================================================
SYSTEM INFORMATION
============================================================

GET /api/admin/system/info

This is the endpoint used by the frontend.
============================================================
*/

router.get(
  '/info',
  async (req, res) => {

    try {

      const postgresVersion =
        await getPostgresVersion();

      return res.json({

        success: true,

        information: {

          applicationVersion:
            '1.0.0',

          environment:
            process.env.NODE_ENV ||
            'development',

          operatingSystem:
            `${os.type()} ${os.release()}`,

          architecture:
            os.arch(),

          hostname:
            os.hostname(),

          webServer:
            'Node.js / Express',

          nodeVersion:
            process.version,

          postgresqlVersion:
            postgresVersion,

          redisVersion:
            'Not configured',

          databaseName:
            process.env.DB_NAME,

          platform:
            process.platform,

          timezone:
            Intl.DateTimeFormat()
              .resolvedOptions()
              .timeZone,

          lastUpdated:
            new Date().toISOString()

        }

      });

    } catch (error) {

      console.error(
        'SYSTEM INFORMATION ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system information.'

      });

    }

  }
);


/*
============================================================
BACKWARD COMPATIBILITY
============================================================

Old endpoint:
GET /api/admin/system/information
============================================================
*/

router.get(
  '/information',
  async (req, res) => {

    try {

      const postgresVersion =
        await getPostgresVersion();

      return res.json({

        success: true,

        information: {

          applicationVersion:
            '1.0.0',

          environment:
            process.env.NODE_ENV ||
            'development',

          operatingSystem:
            `${os.type()} ${os.release()}`,

          architecture:
            os.arch(),

          hostname:
            os.hostname(),

          webServer:
            'Node.js / Express',

          nodeVersion:
            process.version,

          postgresqlVersion:
            postgresVersion,

          redisVersion:
            'Not configured',

          databaseName:
            process.env.DB_NAME,

          platform:
            process.platform,

          timezone:
            Intl.DateTimeFormat()
              .resolvedOptions()
              .timeZone,

          lastUpdated:
            new Date().toISOString()

        }

      });

    } catch (error) {

      console.error(
        'SYSTEM INFORMATION ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system information.'

      });

    }

  }
);


/*
============================================================
SYSTEM LOGS
============================================================

GET /api/admin/system/logs
============================================================
*/

router.get(
  '/logs',
  async (req, res) => {

    try {

      const page =
        Math.max(
          Number(req.query.page) || 1,
          1
        );

      const limit =
        Math.min(
          Math.max(
            Number(req.query.limit) || 10,
            1
          ),
          50
        );

      const offset =
        (page - 1) * limit;

      const search =
        String(
          req.query.search || ''
        ).trim();

      const level =
        String(
          req.query.level || 'ALL'
        ).toUpperCase();

      const values = [];

      const conditions = [];


      if (search) {

        values.push(
          `%${search}%`
        );

        conditions.push(`
          (
            l.message ILIKE $${values.length}
            OR
            l.module ILIKE $${values.length}
          )
        `);

      }


      if (
        level !== 'ALL' &&
        [
          'INFO',
          'WARNING',
          'ERROR',
          'SUCCESS'
        ].includes(level)
      ) {

        values.push(level);

        conditions.push(
          `l.level = $${values.length}`
        );

      }


      const where =
        conditions.length
          ? `WHERE ${conditions.join(' AND ')}`
          : '';


      /*
      --------------------------------------------------------
      Check if system_logs exists.
      --------------------------------------------------------
      */

      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_logs'
          ) AS table_name
        `);

      if (!tableCheck.rows[0]?.table_name) {

        return res.json({

          success: true,

          logs: [],

          pagination: {

            page,

            limit,

            total: 0,

            pages: 0

          }

        });

      }


      const countResult =
        await pool.query(
          `
          SELECT
            COUNT(*)::int AS total

          FROM system_logs l

          ${where}
          `,
          values
        );


      const total =
        Number(
          countResult.rows[0]?.total || 0
        );


      const dataValues = [
        ...values,
        limit,
        offset
      ];


      const result =
        await pool.query(
          `
          SELECT
            l.log_id,
            l.level,
            l.message,
            l.module,
            l.created_at,
            l.user_id,

            CASE
              WHEN u.user_id IS NULL
              THEN NULL

              ELSE TRIM(
                CONCAT(
                  u.first_name,
                  ' ',
                  u.last_name
                )
              )

            END AS user_name

          FROM system_logs l

          LEFT JOIN users u
            ON u.user_id = l.user_id

          ${where}

          ORDER BY
            l.created_at DESC

          LIMIT
            $${values.length + 1}

          OFFSET
            $${values.length + 2}
          `,
          dataValues
        );


      return res.json({

        success: true,

        logs:
          result.rows,

        pagination: {

          page,

          limit,

          total,

          pages:
            Math.ceil(
              total / limit
            )

        }

      });

    } catch (error) {

      console.error(
        'SYSTEM LOGS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system logs.'

      });

    }

  }
);


/*
============================================================
SYSTEM ALERTS
============================================================

GET /api/admin/system/alerts
============================================================
*/

router.get(
  '/alerts',
  async (req, res) => {

    try {

      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_alerts'
          ) AS table_name
        `);


      /*
      If table does not exist,
      return empty data instead of 500.
      */

      if (!tableCheck.rows[0]?.table_name) {

        return res.json({

          success: true,

          alerts: []

        });

      }


      const result =
        await pool.query(`
          SELECT
            alert_id,
            alert_type,
            title,
            message,
            is_read,
            created_at

          FROM system_alerts

          ORDER BY
            created_at DESC

          LIMIT 8
        `);


      return res.json({

        success: true,

        alerts:
          result.rows

      });

    } catch (error) {

      console.error(
        'SYSTEM ALERTS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system alerts.'

      });

    }

  }
);


/*
============================================================
SYSTEM SETTINGS
============================================================

GET /api/admin/system/settings
============================================================
*/

router.get(
  '/settings',
  async (req, res) => {

    try {

      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_settings'
          ) AS table_name
        `);


      if (!tableCheck.rows[0]?.table_name) {

        return res.json({

          success: true,

          settings: []

        });

      }


      const result =
        await pool.query(`
          SELECT
            setting_id,
            setting_key,
            setting_value,
            description,
            updated_by,
            created_at,
            updated_at

          FROM system_settings

          ORDER BY
            setting_key ASC
        `);


      return res.json({

        success: true,

        settings:
          result.rows

      });

    } catch (error) {

      console.error(
        'SYSTEM SETTINGS ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to load system settings.'

      });

    }

  }
);


/*
============================================================
UPDATE SYSTEM SETTING
============================================================

PUT /api/admin/system/settings/:key
============================================================
*/

router.put(
  '/settings/:key',
  async (req, res) => {

    try {

      const key =
        String(
          req.params.key || ''
        ).trim();

      const value =
        req.body?.value ?? null;

      const description =
        req.body?.description ?? null;


      if (!key) {

        return res.status(400).json({

          success: false,

          message:
            'Setting key is required.'

        });

      }


      /*
      --------------------------------------------------------
      Check table.
      --------------------------------------------------------
      */

      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_settings'
          ) AS table_name
        `);


      if (!tableCheck.rows[0]?.table_name) {

        return res.status(503).json({

          success: false,

          message:
            'System settings table is not configured yet.'

        });

      }


      const result =
        await pool.query(
          `
          INSERT INTO system_settings (
            setting_key,
            setting_value,
            description,
            updated_by
          )

          VALUES (
            $1,
            $2,
            $3,
            $4
          )

          ON CONFLICT (
            setting_key
          )

          DO UPDATE SET

            setting_value =
              EXCLUDED.setting_value,

            description =
              EXCLUDED.description,

            updated_by =
              EXCLUDED.updated_by,

            updated_at =
              CURRENT_TIMESTAMP

          RETURNING *
          `,
          [
            key,
            value,
            description,
            req.user.user_id
          ]
        );


      /*
      --------------------------------------------------------
      Write system log if available.
      --------------------------------------------------------
      */

      const logsTable =
        await pool.query(`
          SELECT to_regclass(
            'public.system_logs'
          ) AS table_name
        `);


      if (logsTable.rows[0]?.table_name) {

        await pool.query(
          `
          INSERT INTO system_logs (
            level,
            message,
            module,
            user_id
          )

          VALUES (
            'INFO',
            $1,
            'System',
            $2
          )
          `,
          [
            `System setting "${key}" was updated.`,
            req.user.user_id
          ]
        );

      }


      return res.json({

        success: true,

        message:
          'System setting updated successfully.',

        setting:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'UPDATE SYSTEM SETTING ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to update system setting.'

      });

    }

  }
);


/*
============================================================
MARK ALERT AS READ
============================================================

PATCH /api/admin/system/alerts/:alertId/read
============================================================
*/

router.patch(
  '/alerts/:alertId/read',
  async (req, res) => {

    try {

      const alertId =
        Number(
          req.params.alertId
        );


      if (!Number.isInteger(alertId)) {

        return res.status(400).json({

          success: false,

          message:
            'Invalid alert ID.'

        });

      }


      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_alerts'
          ) AS table_name
        `);


      if (!tableCheck.rows[0]?.table_name) {

        return res.status(404).json({

          success: false,

          message:
            'System alerts are not configured yet.'

        });

      }


      const result =
        await pool.query(
          `
          UPDATE system_alerts

          SET is_read = TRUE

          WHERE alert_id = $1

          RETURNING *
          `,
          [
            alertId
          ]
        );


      if (!result.rows.length) {

        return res.status(404).json({

          success: false,

          message:
            'Alert not found.'

        });

      }


      return res.json({

        success: true,

        alert:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        'MARK ALERT READ ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to update alert.'

      });

    }

  }
);


/*
============================================================
CLEAR CACHE
============================================================

POST /api/admin/system/cache/clear

For the prototype, this records the request.
No fake cache-clearing operation is performed.
============================================================
*/

router.post(
  '/cache/clear',
  async (req, res) => {

    try {

      const tableCheck =
        await pool.query(`
          SELECT to_regclass(
            'public.system_logs'
          ) AS table_name
        `);


      if (tableCheck.rows[0]?.table_name) {

        await pool.query(
          `
          INSERT INTO system_logs (
            level,
            message,
            module,
            user_id
          )

          VALUES (
            'INFO',
            'Application cache clear requested.',
            'System',
            $1
          )
          `,
          [
            req.user.user_id
          ]
        );

      }


      return res.json({

        success: true,

        message:
          'Application cache request completed.'

      });

    } catch (error) {

      console.error(
        'CLEAR CACHE ERROR:',
        error
      );

      return res.status(500).json({

        success: false,

        message:
          'Unable to process cache request.'

      });

    }

  }
);


/*
============================================================
EXPORT
============================================================
*/

module.exports = router;