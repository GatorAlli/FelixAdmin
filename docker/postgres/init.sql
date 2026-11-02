CREATE ROLE felix_app
  LOGIN
  PASSWORD 'felix_test_only';

ALTER DATABASE felix_test OWNER TO felix_app;