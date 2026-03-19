"use client";

import { Download, Rocket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useArtifacts } from "@/hooks/use-sidekicks-data";

export function StoragePage() {
  const { data } = useArtifacts();

  return (
    <div className="space-y-6">
      <div>
        <Badge>Artifacts</Badge>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Artifacts</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Keep every report, build, and dataset close to the run that generated it.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Stored Files</CardTitle>
          <CardDescription>Download outputs or promote deployable bundles directly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {data?.map((artifact) => (
            <div
              key={artifact.id}
              className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="font-medium">{artifact.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {artifact.kind} • {artifact.size} • updated {artifact.updatedAt}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                {artifact.kind === "Build" ? (
                  <Button>
                    <Rocket className="h-4 w-4" />
                    Deploy
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
