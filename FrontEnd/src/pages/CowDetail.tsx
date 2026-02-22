import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, Dna, HeartPulse, Scale } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "@/components/common/StageBadge";
import { VerifiedBadge } from "@/components/common/VerifiedBadge";
import { getCowById } from "@/lib/api";
import type { CowDetailData, CowHealth } from "@/lib/types";
import { SEX_LABELS } from "@/lib/types";
import { formatUsd, formatWeight, formatDate } from "@/lib/utils";

const HEALTH_STYLES: Record<CowHealth, string> = {
  "On Track": "bg-green-100 text-green-800 border-green-200",
  Watch: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Issue: "bg-red-100 text-red-800 border-red-200",
};

const WEIGHT_TYPE_LABELS: Record<string, string> = {
  birth: "Birth",
  weaning: "Weaning",
  yearling: "Yearling",
  sale: "Sale",
};

export function CowDetail() {
  const { cowId } = useParams<{ cowId: string }>();
  const [data, setData] = useState<CowDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!cowId) return;
    setLoading(true);
    getCowById(cowId)
      .then((result) => {
        if (!result) setNotFound(true);
        else setData(result);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [cowId]);

  const cow = data?.cow ?? null;

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">Cow not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No cow with ID &ldquo;{cowId}&rdquo; exists.
        </p>
        <Link
          to="/investor/holdings"
          className="mt-4 text-sm text-primary hover:underline"
        >
          Back to Holdings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/investor/holdings" className="hover:text-foreground">
          Holdings
        </Link>
        <ChevronRight className="h-3 w-3" />
        {cow && (
          <>
            <Link
              to={`/investor/holdings/${cow.herdId}`}
              className="hover:text-foreground"
            >
              {cow.herdId}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-foreground">
          {loading ? <Skeleton className="inline-block h-4 w-24" /> : cow?.cowId}
        </span>
      </nav>

      {/* Title */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      ) : cow ? (
        <div>
          <h2 className="text-2xl font-bold">{cow.animalName || cow.cowId}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground font-mono">
              {cow.cowId}
            </span>
            <StageBadge stage={cow.stage} />
            <VerifiedBadge verified={cow.verified} showLabel />
            {cow.isGenomicEnhanced && (
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs gap-1">
                <Dna className="h-3 w-3" />
                Genomic Enhanced
              </Badge>
            )}
          </div>
        </div>
      ) : null}

      {/* Two-column: Details + Valuation */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Details card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Animal Details</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            ) : cow ? (
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Herd</dt>
                  <dd>
                    <Link
                      to={`/investor/holdings/${cow.herdId}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {cow.herdId}
                    </Link>
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Registration #</dt>
                  <dd className="font-mono text-xs">{cow.registrationNumber}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Official ID (EID)</dt>
                  <dd className="font-mono text-xs">{cow.officialId}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Breed Code</dt>
                  <dd className="font-medium">{cow.breedCode}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sex</dt>
                  <dd className="font-medium">{SEX_LABELS[cow.sexCode]} ({cow.sexCode})</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Birth Date</dt>
                  <dd>{formatDate(cow.birthDate)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Stage</dt>
                  <dd><StageBadge stage={cow.stage} /></dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Days in Stage</dt>
                  <dd className="font-medium">{cow.daysInStage}d</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Current Weight</dt>
                  <dd className="font-medium">{formatWeight(cow.weightLbs)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Health Status</dt>
                  <dd>
                    <Badge variant="outline" className={HEALTH_STYLES[cow.health]}>
                      {cow.health}
                    </Badge>
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Investment to Date</dt>
                  <dd className="font-medium">{formatUsd(cow.costToDateUsd)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Value</dt>
                  <dd className="font-medium">{formatUsd(cow.totalValue)}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Sire Reg. #</dt>
                  <dd className="font-mono text-xs">{cow.sireRegistrationNumber}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Dam Reg. #</dt>
                  <dd className="font-mono text-xs">{cow.damRegistrationNumber}</dd>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Enrolled</dt>
                  <dd>{formatDate(cow.createdAt)}</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        {/* Valuation Breakdown card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Valuation Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data && data.valuations.length > 0 ? (() => {
              const latest = data.valuations[data.valuations.length - 1];
              const scores = [
                { label: "Genetics Score", value: latest.geneticsScore, colorClass: "bg-violet-500" },
                { label: "Health Score", value: latest.healthScore, colorClass: "bg-green-500" },
                { label: "Weight Score", value: latest.weightScore, colorClass: "bg-blue-500" },
                { label: "Certification Score", value: latest.certificationScore, colorClass: "bg-amber-500" },
              ];
              return (
                <div className="space-y-4">
                  <div className="space-y-4">
                    {scores.map((s) => (
                      <div key={s.label}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="font-medium tabular-nums">{s.value.toFixed(1)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${s.colorClass}`}
                            style={{ width: `${Math.min(s.value, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Value</span>
                    <span className="text-lg font-bold">{formatUsd(latest.totalValue)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Method: {latest.valuationMethodVersion} · as of {formatDate(latest.valuationDate)}
                  </p>
                </div>
              );
            })() : (
              <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                No valuation data available.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weight History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-600" />
            Weight History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : data && data.weights.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 pr-4 font-medium">Weight</th>
                    <th className="pb-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.weights.map((w) => (
                    <tr key={w.weightId}>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {WEIGHT_TYPE_LABELS[w.weightType] ?? w.weightType}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-muted-foreground">{formatDate(w.weightDate)}</td>
                      <td className="py-2 pr-4 font-medium">{formatWeight(w.weightLbs)}</td>
                      <td className="py-2 font-mono text-xs text-muted-foreground">{w.locationCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No weight records available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Health Records */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-green-600" />
            Health &amp; Vaccination Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : data && data.healthRecords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Vaccine</th>
                    <th className="pb-2 pr-4 font-medium">Program</th>
                    <th className="pb-2 pr-4 font-medium">Cert. #</th>
                    <th className="pb-2 pr-4 font-medium">Date</th>
                    <th className="pb-2 font-medium">Verified</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.healthRecords.map((hr) => (
                    <tr key={hr.healthRecordId}>
                      <td className="py-2 pr-4 max-w-[180px] truncate text-xs">{hr.vaccineName}</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-xs">
                          {hr.healthProgramName}
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">
                        {hr.certificationNumber}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {formatDate(hr.administrationDate)}
                      </td>
                      <td className="py-2">
                        <VerifiedBadge verified={hr.verifiedFlag} showLabel />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No health records available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* EPD Genetics — only shown if genomic enhanced */}
      {(loading || (data && data.epds.length > 0)) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Dna className="h-4 w-4 text-violet-600" />
              Expected Progeny Differences (EPDs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-24 w-full" />
            ) : data && data.epds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Trait</th>
                      <th className="pb-2 pr-4 font-medium">EPD Value</th>
                      <th className="pb-2 pr-4 font-medium">Accuracy</th>
                      <th className="pb-2 pr-4 font-medium">Percentile</th>
                      <th className="pb-2 font-medium">Evaluated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.epds.map((epd) => (
                      <tr key={epd.cowEpdId}>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200 text-xs">
                            {epd.traitCode}
                          </Badge>
                        </td>
                        <td className="py-2 pr-4 font-medium font-mono">
                          {epd.epdValue >= 0 ? "+" : ""}{epd.epdValue.toFixed(2)}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {(epd.accuracy * 100).toFixed(0)}%
                        </td>
                        <td className="py-2 pr-4">
                          <span className={
                            epd.percentileRank >= 75 ? "text-green-600 font-medium" :
                            epd.percentileRank >= 50 ? "text-foreground" :
                            "text-muted-foreground"
                          }>
                            {epd.percentileRank}th
                          </span>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {formatDate(epd.evaluationDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No EPD data available.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
