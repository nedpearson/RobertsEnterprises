const fs = require('fs');
const path = 'apps/marketing/src/pages/PlatformAdmin/TenantControlCenter.tsx';
let content = fs.readFileSync(path, 'utf8');

const supportReplacement = `            <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supportTickets.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium text-xs">{t.id.split('-')[0]}</TableCell>
                      <TableCell>{t.subject}</TableCell>
                      <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{t.priority}</Badge></TableCell>
                      <TableCell className="text-stone-500">{new Date(t.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {supportTickets.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-stone-500">No support tickets found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>`;

content = content.replace(
  /<div className="text-stone-500 text-sm text-center py-8">Support ticketing UI under construction\. Please use the global Support Queue for now\.<\/div>/,
  supportReplacement
);

const integrationsReplacement = `              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Synced</TableHead>
                    <TableHead>Errors</TableHead>
                    <TableHead>Last Sync</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {integrations.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium capitalize">{i.integration_type}</TableCell>
                      <TableCell><Badge variant="outline">{i.status}</Badge></TableCell>
                      <TableCell>{i.total_records_synced || 0}</TableCell>
                      <TableCell>{i.error_count > 0 ? <span className="text-rose-500">{i.error_count}</span> : '0'}</TableCell>
                      <TableCell className="text-stone-500">{i.last_sync_at ? new Date(i.last_sync_at).toLocaleString() : 'Never'}</TableCell>
                    </TableRow>
                  ))}
                  {integrations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-stone-500">No active integrations found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>`;
              
content = content.replace(
  /<div className="text-stone-500 text-sm text-center py-8">Integrations dashboard under construction\.<\/div>/,
  integrationsReplacement
);

const auditReplacement = `              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event Type</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium text-xs">{log.event_type}</TableCell>
                      <TableCell className="text-xs">{log.actor_type}: {log.actor_id?.split('-')[0]}</TableCell>
                      <TableCell><Badge variant="outline">{log.status}</Badge></TableCell>
                      <TableCell className="text-stone-500">{new Date(log.created_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-stone-500">No audit logs found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>`;
              
content = content.replace(
  /<div className="text-stone-500 text-sm text-center py-8">Audit logs are coming in Phase 5\.<\/div>/,
  auditReplacement
);

fs.writeFileSync(path, content);
