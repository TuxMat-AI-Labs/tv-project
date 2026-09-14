import { prisma } from "@/lib/prisma";
import { MDC_REPORT_KEY } from "@/lib/mdc/protocol";
import { CALIBRATION_SETTING_KEY } from "@/lib/display/calibration";
import { TroubleshootView, type MdcReport } from "@/components/hub/TroubleshootView";

export const dynamic = "force-dynamic";

/**
 * Diagnostics for the whole wall. Admin-only (see proxy.ts).
 *
 * The MDC snapshot is read here on the server rather than fetched by the
 * client, so it needs no API of its own and cannot leak: the only way in is a
 * page the middleware already gates.
 */
export default async function TroubleshootPage() {
  const [row, calRow] = await Promise.all([
    prisma.setting.findUnique({ where: { key: MDC_REPORT_KEY } }),
    prisma.setting.findUnique({ where: { key: CALIBRATION_SETTING_KEY } }),
  ]);

  let mdcReport: MdcReport = null;
  if (row) {
    try {
      mdcReport = JSON.parse(row.value) as MdcReport;
    } catch {
      // A malformed row should not take the page down — the viewport table
      // below it is the half that is always available.
      mdcReport = null;
    }
  }

  return <TroubleshootView mdcReport={mdcReport} calibrationOn={calRow?.value === "1"} />;
}
