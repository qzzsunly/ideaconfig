## 2018-08-09 (M14)

*  _(Concourse)_ added support for `tags` property in `resources` ([#66](https://github.com/spring-projects/sts4/issues/66))

## 2018-07-23 (M13)

* _(Concourse)_ Added support for missing attributes to `GitGetParams`, `GitPutParams`, `Job` and `Step` schemas ([#64](https://github.com/spring-projects/sts4/issues/64)), ([#65](https://github.com/spring-projects/sts4/issues/65))
* _(Concourse)_ fixed: Concourse VSCode Extension: Does not recognize GCS buckets in semver resource ([#60](https://github.com/spring-projects/sts4/issues/60))

## 2018-06-08 (M12)

* _(Concourse)_ add support for new attributes of DockerImageSource (aws_session_token, max_concurrent_downloads, max_concurrent_uploads) and DockerImagePutParams (additional_tags, cache_from, load_bases, target_name) ([#56](https://github.com/spring-projects/sts4/issues/56))
* _(Concourse)_ bugfix: quick fixes work again

## 2018-05-14 (M11)

* _(all)_ JVM used to run the language servers can now be specified via custom settings ([#51](https://github.com/spring-projects/sts4/issues/51))

## 2018-03-15 (M10)

* _(Concourse)_ added support for symbols for groups
* _(Concourse)_ updated URLs in documentation to point to new Concourse domain
* _(all)_ language server processes now show up with their real name when using `jps` instead of just `JarLauncher`

## 2018-02-23 (M9)

* _(Concourse)_ Concourse CI Pipeline Editor reports errors on valid `pipeline.yml` fixed (([#41](https://github.com/spring-projects/sts4/issues/41)))
* _(all)_ improved the way the JDK to run the language server is found together with an improved error message if no JDK can be found

## 2018-01-30 (M8)

* _(Concourse)_ added support for cache attribute in tasks
* _(Concourse)_ added missing version attribute in image_resource

## 2017-12-15 (M7)

* _(all)_ issues solved when running on Windows ([#25](https://github.com/spring-projects/sts4/issues/25), [#26](https://github.com/spring-projects/sts4/issues/26), [#29](https://github.com/spring-projects/sts4/issues/29))
* _(Concourse)_ getstep.version property in concourse pipeline now accepts a Map<String,String> ([#24](https://github.com/spring-projects/sts4/issues/24)) as well as special values 'every' and 'latest' ([#28](https://github.com/spring-projects/sts4/issues/28)). 

## 2017-12-04

* initial public beta launch