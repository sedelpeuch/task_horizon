{{/*
Full name = release name (which carries the environment, e.g. taskhorizon-test)
*/}}
{{- define "taskhorizon.fullname" -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Component-scoped name: <release>-<component>
Call: include "taskhorizon.componentName" (dict "Release" .Release "component" "api")
*/}}
{{- define "taskhorizon.componentName" -}}
{{- printf "%s-%s" .Release.Name .component | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels applied to every resource
*/}}
{{- define "taskhorizon.labels" -}}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}

{{/*
Selector labels — instance includes env via Release.Name, preventing cross-env selection
Call: include "taskhorizon.selectorLabels" (dict "Release" .Release "component" "api")
*/}}
{{- define "taskhorizon.selectorLabels" -}}
app.kubernetes.io/name: taskhorizon
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .component }}
{{- end }}

{{/*
DB host resolution:
  - postgres.enabled=true  → in-cluster service name
  - postgres.enabled=false → db.externalHost (required, fails loudly if empty)
*/}}
{{- define "taskhorizon.dbHost" -}}
{{- if .Values.postgres.enabled -}}
{{- include "taskhorizon.componentName" (dict "Release" .Release "component" "postgres") }}
{{- else -}}
{{- required "db.externalHost must be set when postgres.enabled=false" .Values.db.externalHost }}
{{- end }}
{{- end }}

{{/*
DB secret name:
  - existingSecret.enabled=true  → pre-existing secret name (prod RDS)
  - existingSecret.enabled=false → Helm-managed secret (test/staging)
*/}}
{{- define "taskhorizon.dbSecretName" -}}
{{- if .Values.db.existingSecret.enabled -}}
{{- required "db.existingSecret.name must be set when existingSecret.enabled=true" .Values.db.existingSecret.name }}
{{- else -}}
{{- include "taskhorizon.componentName" (dict "Release" .Release "component" "db-credentials") }}
{{- end }}
{{- end }}

{{/*
ServiceAccount name
*/}}
{{- define "taskhorizon.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "taskhorizon.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
