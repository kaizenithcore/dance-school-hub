begin;

-- Sprint 12 hardening: ensure students can only read their own exam artifacts.
-- Existing association/school scopes remain intact; this adds student self-scope.

create policy if not exists exam_results_select_student_own
on exam_results for select
using (
  exists (
    select 1
    from exam_enrollments ee
    join students s on s.id = ee.student_id
    where ee.id = exam_results.enrollment_id
      and s.user_id = auth.uid()
  )
);

create policy if not exists exam_certificates_select_student_own
on exam_certificates for select
using (
  exists (
    select 1
    from exam_results er
    join exam_enrollments ee on ee.id = er.enrollment_id
    join students s on s.id = ee.student_id
    where er.id = exam_certificates.result_id
      and s.user_id = auth.uid()
  )
);

create policy if not exists exam_enrollments_select_student_own
on exam_enrollments for select
using (
  exists (
    select 1
    from students s
    where s.id = exam_enrollments.student_id
      and s.user_id = auth.uid()
  )
);

commit;
