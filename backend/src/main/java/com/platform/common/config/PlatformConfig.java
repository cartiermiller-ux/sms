package com.platform.common.config;

import com.platform.common.core.EnumUtils;
import com.platform.common.enums.YesOrNoEnum;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Component;

/**
 * 读取项目相关配置
 */
@Component
@Configuration
@ConfigurationProperties(prefix = "platform")
public class PlatformConfig {

    /**
     * 上传路径
     */
    public static String ROOT_PATH;

    /**
     * 文件预览
     */
    public static String PREVIEW = "/preview/**";

    /**
     * 图标
     */
    public static String FAVICON = "/favicon.ico";

    /**
     * token超时时间（分钟）
     */
    public static Integer TIMEOUT;

    /**
     * 是否开启短信
     */
    public static YesOrNoEnum SMS;

    /**
     * 「附近的人」搜索半径（公里）
     * 原代码在 NearServiceImpl 里硬编码 100，果敢老街到临沧市区约 130 公里会互相看不到，
     * 故提取为配置项，可在 application-*.yml 里调整
     */
    public static Integer NEAR_RADIUS = 100;

    @Value("${platform.timeout}")
    public void setTokenTimeout(Integer timeout) {
        PlatformConfig.TIMEOUT = timeout;
    }

    @Value("${platform.sms:N}")
    public void setSms(String sms) {
        PlatformConfig.SMS = EnumUtils.toEnum(YesOrNoEnum.class, sms, YesOrNoEnum.NO);
    }

    @Value("${platform.nearRadius:100}")
    public void setNearRadius(Integer nearRadius) {
        PlatformConfig.NEAR_RADIUS = nearRadius;
    }

    @Value("${platform.rootPath}")
    public void setRootPath(String rootPath) {
        PlatformConfig.ROOT_PATH = rootPath;
    }

}