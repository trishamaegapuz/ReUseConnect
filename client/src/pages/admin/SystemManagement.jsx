import React, { useEffect, useMemo, useState } from 'react';

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  Eye,
  FileText,
  HardDrive,
  Info,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  Wifi,
  XCircle
} from 'lucide-react';

import {
  getAdminSystemSummary,
  getAdminSystemAlerts,
  getAdminSystemLogs,
  getAdminSystemInfo
} from '../../services/api';

import '../../styles/SystemManagement.css';


const SystemManagement = () => {

  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [systemInfo, setSystemInfo] = useState(null);

  const [activeTab, setActiveTab] =
    useState('health');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [selectedLog, setSelectedLog] =
    useState(null);


  /*
  ============================================================
  LOAD SYSTEM DATA
  ============================================================
  */

  const loadSystemData = async (
    showRefresh = false
  ) => {

    try {

      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      const [
        summaryResponse,
        alertsResponse,
        logsResponse,
        infoResponse
      ] = await Promise.all([

        getAdminSystemSummary(),

        getAdminSystemAlerts(),

        getAdminSystemLogs({
          page: 1,
          limit: 10
        }),

        getAdminSystemInfo()

      ]);


      setSummary(
        summaryResponse?.summary || null
      );

      setAlerts(
        Array.isArray(
          alertsResponse?.alerts
        )
          ? alertsResponse.alerts
          : []
      );

      setLogs(
        Array.isArray(
          logsResponse?.logs
        )
          ? logsResponse.logs
          : []
      );

      setSystemInfo(
        infoResponse?.information || null
      );

    } catch (err) {

      console.error(
        'System Management:',
        err
      );

      setError(
        err?.message ||
        'Unable to load system information.'
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  };


  useEffect(() => {

    loadSystemData();

  }, []);


  /*
  ============================================================
  FORMATTERS
  ============================================================
  */

  const formatUptime = (uptime) => {

    if (!uptime) {
      return '—';
    }

    const days =
      Number(uptime.days || 0);

    const hours =
      Number(uptime.hours || 0);

    const minutes =
      Number(uptime.minutes || 0);

    if (days > 0) {
      return `${days}d ${hours}h`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;

  };


  const formatDateTime = (value) => {

    if (!value) {
      return '—';
    }

    try {

      return new Date(value)
        .toLocaleString();

    } catch {

      return '—';

    }

  };


  const formatPercent = (value) => {

    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return '—';
    }

    return `${Number(value).toFixed(1)}%`;

  };


  /*
  ============================================================
  DERIVED VALUES
  ============================================================
  */

  const serverStatus =
    summary?.server?.status ||
    'Unknown';

  const databaseStatus =
    summary?.database?.status ||
    'Unknown';

  const uptime =
    formatUptime(
      summary?.server?.uptime
    );

  const storagePercent =
    summary?.storage?.usedPercent ??
    null;

  const activeSessions =
    summary?.activeSessions ??
    0;

  const cpuUsage =
    summary?.resources?.cpu ??
    null;

  const memoryUsage =
    summary?.resources?.memory ??
    null;

  const diskUsage =
    summary?.resources?.disk ??
    null;

  const networkUsage =
    summary?.resources?.network ??
    null;


  const statusClass = (status) => {

    const value =
      String(status || '')
        .toLowerCase();

    if (value === 'online') {
      return 'system-status online';
    }

    if (value === 'offline') {
      return 'system-status offline';
    }

    return 'system-status unknown';

  };


  const tabs = useMemo(() => [

    {
      id: 'health',
      label: 'System Health',
      icon: Activity
    },

    {
      id: 'server',
      label: 'Server Info',
      icon: Server
    },

    {
      id: 'database',
      label: 'Database',
      icon: Database
    },

    {
      id: 'logs',
      label: 'Logs',
      icon: FileText
    },

    {
      id: 'configuration',
      label: 'Configuration',
      icon: Settings
    }

  ], []);


  /*
  ============================================================
  KPI CARD
  ============================================================
  */

  const KpiCard = ({
    icon: Icon,
    label,
    value,
    description,
    className = ''
  }) => (

    <div
      className={`system-kpi-card ${className}`}
    >

      <div className="system-kpi-top">

        <div className="system-kpi-icon">
          <Icon size={20} />
        </div>

      </div>

      <div className="system-kpi-label">
        {label}
      </div>

      <div className="system-kpi-value">
        {loading ? '—' : value}
      </div>

      <div className="system-kpi-description">
        {description}
      </div>

    </div>

  );


  /*
  ============================================================
  RESOURCE CARD
  ============================================================
  */

  const ResourceCard = ({
    icon: Icon,
    label,
    value,
    description
  }) => {

    const numericValue =
      value === null ||
      value === undefined
        ? null
        : Number(value);

    return (

      <div className="resource-card">

        <div className="resource-card-header">

          <div className="resource-icon">
            <Icon size={18} />
          </div>

          <span>
            {label}
          </span>

        </div>

        <div className="resource-value">

          {numericValue === null ||
          Number.isNaN(numericValue)
            ? '—'
            : `${numericValue.toFixed(1)}%`}

        </div>

        <div className="resource-progress">

          <div
            className="resource-progress-fill"
            style={{
              width:
                numericValue === null
                  ? '0%'
                  : `${Math.min(
                      Math.max(
                        numericValue,
                        0
                      ),
                      100
                    )}%`
            }}
          />

        </div>

        <div className="resource-description">
          {description}
        </div>

      </div>

    );

  };


  /*
  ============================================================
  RENDER HEALTH
  ============================================================
  */

  const renderHealth = () => (

    <>

      <div className="system-section-heading">

        <div>

          <h2>
            System Health
          </h2>

          <p>
            Monitor the current health and resource
            utilization of the application server.
          </p>

        </div>

        <div className="health-live">

          <span className="health-dot" />

          Live System Status

        </div>

      </div>


      <div className="resource-grid">

        <ResourceCard
          icon={Cpu}
          label="CPU Usage"
          value={cpuUsage}
          description="Current server CPU utilization"
        />

        <ResourceCard
          icon={Activity}
          label="Memory Usage"
          value={memoryUsage}
          description="Current system memory utilization"
        />

        <ResourceCard
          icon={HardDrive}
          label="Disk Usage"
          value={diskUsage}
          description="Storage used by the server"
        />

        <ResourceCard
          icon={Wifi}
          label="Network Usage"
          value={networkUsage}
          description={
            networkUsage === null
              ? 'Network monitoring not configured'
              : 'Current network utilization'
          }
        />

      </div>


      <div className="system-health-grid">

        <div className="performance-card">

          <div className="card-header-row">

            <div>

              <h3>
                Server Performance
              </h3>

              <p>
                Current application server status
              </p>

            </div>

            <Activity size={19} />

          </div>


          <div className="performance-status">

            <div
              className={
                serverStatus === 'Online'
                  ? 'performance-circle online'
                  : 'performance-circle'
              }
            >
              <Server size={30} />
            </div>

            <div>

              <strong>
                {serverStatus}
              </strong>

              <span>
                Node.js / Express server
              </span>

            </div>

          </div>


          <div className="performance-metrics">

            <div>

              <span>
                Node Version
              </span>

              <strong>
                {summary?.server?.nodeVersion ||
                  '—'}
              </strong>

            </div>

            <div>

              <span>
                Platform
              </span>

              <strong>
                {summary?.server?.platform ||
                  '—'}
              </strong>

            </div>

            <div>

              <span>
                Hostname
              </span>

              <strong>
                {summary?.server?.hostname ||
                  '—'}
              </strong>

            </div>

          </div>

        </div>


        <div className="system-info-card">

          <div className="card-header-row">

            <div>

              <h3>
                System Alerts
              </h3>

              <p>
                Recent system notifications
              </p>

            </div>

            <AlertTriangle size={19} />

          </div>


          {alerts.length === 0 ? (

            <div className="empty-alerts">

              <CheckCircle2 size={25} />

              <strong>
                No active alerts
              </strong>

              <span>
                The system currently has no
                recorded alerts.
              </span>

            </div>

          ) : (

            <div className="alert-list">

              {alerts.map((alert) => (

                <div
                  className="alert-item"
                  key={alert.alert_id}
                >

                  <div className="alert-icon">

                    <AlertTriangle size={16} />

                  </div>

                  <div>

                    <strong>
                      {alert.title}
                    </strong>

                    <span>
                      {alert.message ||
                        'No additional details.'}
                    </span>

                    <small>
                      {formatDateTime(
                        alert.created_at
                      )}
                    </small>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>

    </>

  );


  /*
  ============================================================
  RENDER SERVER INFO
  ============================================================
  */

  const renderServerInfo = () => (

    <div className="tab-content">

      <div className="system-section-heading">

        <div>

          <h2>
            Server Information
          </h2>

          <p>
            Current application server environment.
          </p>

        </div>

      </div>


      <div className="details-grid">

        <div className="detail-card">

          <Server size={19} />

          <span>
            Operating System
          </span>

          <strong>
            {systemInfo?.operatingSystem ||
              '—'}
          </strong>

        </div>


        <div className="detail-card">

          <Cpu size={19} />

          <span>
            Node.js Version
          </span>

          <strong>
            {systemInfo?.nodeVersion ||
              '—'}
          </strong>

        </div>


        <div className="detail-card">

          <Server size={19} />

          <span>
            Web Server
          </span>

          <strong>
            {systemInfo?.webServer ||
              '—'}
          </strong>

        </div>


        <div className="detail-card">

          <Info size={19} />

          <span>
            Environment
          </span>

          <strong>
            {systemInfo?.environment ||
              '—'}
          </strong>

        </div>


        <div className="detail-card">

          <Info size={19} />

          <span>
            Architecture
          </span>

          <strong>
            {systemInfo?.architecture ||
              '—'}
          </strong>

        </div>


        <div className="detail-card">

          <ShieldCheck size={19} />

          <span>
            Hostname
          </span>

          <strong>
            {systemInfo?.hostname ||
              '—'}
          </strong>

        </div>

      </div>

    </div>

  );


  /*
  ============================================================
  RENDER DATABASE
  ============================================================
  */

  const renderDatabase = () => (

    <div className="tab-content">

      <div className="system-section-heading">

        <div>

          <h2>
            Database
          </h2>

          <p>
            PostgreSQL database connection and
            storage information.
          </p>

        </div>

        <div
          className={statusClass(
            databaseStatus
          )}
        >

          {databaseStatus === 'Online'
            ? <CheckCircle2 size={15} />
            : <XCircle size={15} />}

          {databaseStatus}

        </div>

      </div>


      <div className="database-overview">

        <div className="database-main-card">

          <Database size={34} />

          <div>

            <span>
              PostgreSQL Database
            </span>

            <strong>
              {systemInfo?.databaseName ||
                'reuseconnect_db'}
            </strong>

          </div>

        </div>


        <div className="database-detail-card">

          <span>
            PostgreSQL Version
          </span>

          <strong>
            {systemInfo?.postgresqlVersion ||
              '—'}
          </strong>

        </div>


        <div className="database-detail-card">

          <span>
            Database Size
          </span>

          <strong>
            {summary?.database?.sizeGB !==
              undefined
              ? `${summary.database.sizeGB} GB`
              : '—'}
          </strong>

        </div>


        <div className="database-detail-card">

          <span>
            Active Sessions
          </span>

          <strong>
            {activeSessions}
          </strong>

        </div>

      </div>


      <div className="database-status-panel">

        <div className="database-status-icon">

          {databaseStatus === 'Online'
            ? <CheckCircle2 size={25} />
            : <XCircle size={25} />}

        </div>

        <div>

          <strong>
            Database Connection
          </strong>

          <span>
            {databaseStatus === 'Online'
              ? 'PostgreSQL connection is working normally.'
              : 'PostgreSQL connection could not be verified.'}
          </span>

        </div>

      </div>

    </div>

  );


  /*
  ============================================================
  RENDER LOGS
  ============================================================
  */

  const renderLogs = () => (

    <div className="tab-content">

      <div className="system-section-heading">

        <div>

          <h2>
            System Logs
          </h2>

          <p>
            Review recorded system activity and
            administrative actions.
          </p>

        </div>

      </div>


      {logs.length === 0 ? (

        <div className="empty-state-large">

          <FileText size={35} />

          <h3>
            No system logs
          </h3>

          <p>
            There are currently no recorded
            system log entries.
          </p>

        </div>

      ) : (

        <div className="logs-table-wrapper">

          <table className="system-logs-table">

            <thead>

              <tr>

                <th>
                  Level
                </th>

                <th>
                  Module
                </th>

                <th>
                  Message
                </th>

                <th>
                  User
                </th>

                <th>
                  Date
                </th>

                <th>
                  Action
                </th>

              </tr>

            </thead>

            <tbody>

              {logs.map((log) => (

                <tr key={log.log_id}>

                  <td>

                    <span
                      className={`log-level ${
                        String(
                          log.level || ''
                        ).toLowerCase()
                      }`}
                    >
                      {log.level}
                    </span>

                  </td>

                  <td>
                    {log.module || 'System'}
                  </td>

                  <td className="log-message">
                    {log.message}
                  </td>

                  <td>
                    {log.user_name || 'System'}
                  </td>

                  <td>
                    {formatDateTime(
                      log.created_at
                    )}
                  </td>

                  <td>

                    <button
                      type="button"
                      className="icon-action-button"
                      title="View log"
                      onClick={() =>
                        setSelectedLog(log)
                      }
                    >
                      <Eye size={16} />
                    </button>

                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );


  /*
  ============================================================
  RENDER CONFIGURATION
  ============================================================
  */

  const renderConfiguration = () => (

    <div className="tab-content">

      <div className="system-section-heading">

        <div>

          <h2>
            Configuration
          </h2>

          <p>
            Current application environment
            configuration.
          </p>

        </div>

      </div>


      <div className="configuration-grid">

        <div className="configuration-card">

          <Settings size={20} />

          <div>

            <span>
              Application Version
            </span>

            <strong>
              {systemInfo?.applicationVersion ||
                '—'}
            </strong>

          </div>

        </div>


        <div className="configuration-card">

          <ShieldCheck size={20} />

          <div>

            <span>
              Environment
            </span>

            <strong>
              {systemInfo?.environment ||
                '—'}
            </strong>

          </div>

        </div>


        <div className="configuration-card">

          <Database size={20} />

          <div>

            <span>
              Database
            </span>

            <strong>
              {systemInfo?.databaseName ||
                '—'}
            </strong>

          </div>

        </div>


        <div className="configuration-card">

          <Clock3 size={20} />

          <div>

            <span>
              Timezone
            </span>

            <strong>
              {systemInfo?.timezone ||
                '—'}
            </strong>

          </div>

        </div>


        <div className="configuration-card">

          <Wifi size={20} />

          <div>

            <span>
              Redis
            </span>

            <strong>
              {systemInfo?.redisVersion ||
                'Not configured'}
            </strong>

          </div>

        </div>

      </div>


      <div className="configuration-note">

        <Info size={19} />

        <div>

          <strong>
            Configuration information
          </strong>

          <p>
            This section displays the current
            server configuration. Values shown
            here come from the running application
            environment.
          </p>

        </div>

      </div>

    </div>

  );


  /*
  ============================================================
  TAB CONTENT
  ============================================================
  */

  const renderTabContent = () => {

    switch (activeTab) {

      case 'server':
        return renderServerInfo();

      case 'database':
        return renderDatabase();

      case 'logs':
        return renderLogs();

      case 'configuration':
        return renderConfiguration();

      case 'health':
      default:
        return renderHealth();

    }

  };


  /*
  ============================================================
  MAIN RENDER
  ============================================================
  */

  return (

    <div className="system-management-page">

      <div className="system-management-inner">


        {/* ==================================================
            ERROR
            ================================================== */}

        {error && (

          <div className="system-error">

            <XCircle size={18} />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                loadSystemData()
              }
            >
              Try again
            </button>

          </div>

        )}


        {/* ==================================================
            KPI CARDS
            ================================================== */}

        <div className="system-kpi-grid">

          <KpiCard
            icon={Clock3}
            label="System Uptime"
            value={uptime}
            description="Since application start"
          />

          <KpiCard
            icon={Server}
            label="Server Status"
            value={serverStatus}
            description="Application server"
          />

          <KpiCard
            icon={Database}
            label="Database Status"
            value={databaseStatus}
            description="PostgreSQL"
          />

          <KpiCard
            icon={HardDrive}
            label="Storage Usage"
            value={
              storagePercent === null
                ? '—'
                : formatPercent(
                    storagePercent
                  )
            }
            description={
              summary?.storage
                ? `${summary.storage.usedGB} GB / ${summary.storage.totalGB} GB`
                : 'Storage information'
            }
          />

          <KpiCard
            icon={Activity}
            label="Active Sessions"
            value={activeSessions}
            description="Current database sessions"
          />

        </div>


        {/* ==================================================
            TABS
            ================================================== */}

        <div className="system-tabs">

          {tabs.map((tab) => {

            const Icon = tab.icon;

            return (

              <button
                type="button"
                key={tab.id}
                className={
                  activeTab === tab.id
                    ? 'system-tab active'
                    : 'system-tab'
                }
                onClick={() =>
                  setActiveTab(tab.id)
                }
              >

                <Icon size={16} />

                <span>
                  {tab.label}
                </span>

              </button>

            );

          })}

        </div>


        {/* ==================================================
            CONTENT
            ================================================== */}

        <div className="system-tab-panel">

          {renderTabContent()}

        </div>


        {/* ==================================================
            FOOTER INFO
            ================================================== */}

        <div className="system-last-updated">

          <Info size={14} />

          <span>
            Last updated:{' '}
            {systemInfo?.lastUpdated
              ? formatDateTime(
                  systemInfo.lastUpdated
                )
              : '—'}
          </span>

        </div>

      </div>


      {/* ====================================================
          LOG MODAL
          ==================================================== */}

      {selectedLog && (

        <div
          className="system-modal-overlay"
          onClick={() =>
            setSelectedLog(null)
          }
        >

          <div
            className="system-log-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <div className="system-modal-header">

              <div>

                <span>
                  System Log
                </span>

                <h3>
                  Log Details
                </h3>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
              >
                ×
              </button>

            </div>


            <div className="system-modal-body">

              <div className="modal-detail-row">

                <span>
                  Level
                </span>

                <strong>
                  {selectedLog.level}
                </strong>

              </div>


              <div className="modal-detail-row">

                <span>
                  Module
                </span>

                <strong>
                  {selectedLog.module ||
                    'System'}
                </strong>

              </div>


              <div className="modal-detail-row">

                <span>
                  User
                </span>

                <strong>
                  {selectedLog.user_name ||
                    'System'}
                </strong>

              </div>


              <div className="modal-detail-row">

                <span>
                  Date
                </span>

                <strong>
                  {formatDateTime(
                    selectedLog.created_at
                  )}
                </strong>

              </div>


              <div className="modal-message">

                <span>
                  Message
                </span>

                <p>
                  {selectedLog.message}
                </p>

              </div>

            </div>


            <div className="system-modal-footer">

              <button
                type="button"
                onClick={() =>
                  setSelectedLog(null)
                }
              >
                Close
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

};


export default SystemManagement;